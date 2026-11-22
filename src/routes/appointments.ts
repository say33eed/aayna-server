import { Router } from "express";
import { ObjectId, MongoServerError } from "mongodb";
import { requireAuth, requireRole } from "../middleware/authorize.js";
import { getDatabase } from "../config/database.js";

export const appointmentsRouter = Router();
export const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: unknown): value is string => typeof value === "string" && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const dhakaNow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
};
const isFutureOrToday = (value: string) => value >= dhakaNow().slice(0, 10);
const isUpcomingSlot = (date: string, time: string) => `${date} ${time}` > dhakaNow();

appointmentsRouter.get("/slots", async (req, res) => {
  const serviceId = req.query.serviceId;
  const date = req.query.date;
  if (typeof serviceId !== "string" || !ObjectId.isValid(serviceId) || !validDate(date)) {
    res.status(400).json({ success: false, message: "Select a valid service and date." }); return;
  }
  if (!isFutureOrToday(date)) { res.status(400).json({ success: false, message: "Choose today or a future date." }); return; }
  try {
    const db = await getDatabase();
    const service = await db.collection("services").findOne({ _id: new ObjectId(serviceId), status: "active" }, { projection: { _id: 1 } });
    if (!service) { res.status(404).json({ success: false, message: "Service is unavailable." }); return; }
    const taken = await db.collection("appointments").find({ serviceId, appointmentDate: date, status: { $in: ["pending", "confirmed"] } }, { projection: { timeSlot: 1 } }).toArray();
    const occupied = new Set(taken.map((row) => row.timeSlot));
    res.set("Cache-Control", "no-store").json({ success: true, data: TIME_SLOTS.map((time) => ({ time, available: !occupied.has(time) && isUpcomingSlot(date, time) })) });
  } catch { res.status(503).json({ success: false, message: "Unable to load time slots." }); }
});

appointmentsRouter.post("/", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const user = req.authenticatedUser!;
    const { serviceId, appointmentDate, timeSlot, message } = req.body ?? {};
    if (typeof serviceId !== "string" || !ObjectId.isValid(serviceId) || !validDate(appointmentDate) || !isFutureOrToday(appointmentDate) || !TIME_SLOTS.includes(timeSlot) || !isUpcomingSlot(appointmentDate, timeSlot)) {
      res.status(400).json({ success: false, message: "Select a valid service, future date, and time slot." }); return;
    }
    if (message !== undefined && (typeof message !== "string" || message.length > 500)) {
      res.status(400).json({ success: false, message: "Message must be 500 characters or fewer." }); return;
    }
    const db = await getDatabase();
    const service = await db.collection("services").findOne({ _id: new ObjectId(serviceId), status: "active" });
    if (!service) { res.status(404).json({ success: false, message: "This service is no longer available." }); return; }
    if (typeof service.price !== "number" || !Number.isFinite(service.price) || service.price < 0) { res.status(422).json({ success: false, message: "Service price is invalid." }); return; }
    const appointments = db.collection("appointments");
    // A unique slotKey prevents concurrent duplicate requests; cancellation must unset slotKey.
    await appointments.createIndex({ slotKey: 1 }, { unique: true, partialFilterExpression: { slotKey: { $type: "string" } } });
    const record = {
      serviceId, customerId: user.id, appointmentDate, timeSlot,
      message: typeof message === "string" ? message.trim() : "",
      servicePrice: service.price, paymentStatus: "unpaid", status: "pending",
      slotKey: `${serviceId}:${appointmentDate}:${timeSlot}`,
      createdAt: new Date(),
    };
    const result = await appointments.insertOne(record);
    res.status(201).json({ success: true, message: "Appointment request submitted.", data: { id: String(result.insertedId), status: "pending", paymentStatus: "unpaid" } });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) { res.status(409).json({ success: false, message: "This time slot has just been booked. Choose another." }); return; }
    res.status(503).json({ success: false, message: "Unable to submit appointment right now." });
  }
});
