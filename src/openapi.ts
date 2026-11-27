export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Aayna API",
    "version": "0.1.0",
    "description": "Salon booking REST API. Better Auth handles /api/auth/* (email/password and Google OAuth); consult https://www.better-auth.com/docs for its library-managed contract. Protected endpoints accept a valid session or JWT. This reference is read-only; public GET requests can be tested in the separate explorer."
  },
  "servers": [
    {
      "url": "/"
    }
  ],
  "paths": {
    "/health/ready": { "get": { "tags": ["System"], "summary": "Database and required index readiness", "security": [], "responses": { "200": { "description": "Ready" }, "503": { "description": "Not ready" } } } },
    "/health": {
      "get": {
        "tags": [
          "System"
        ],
        "summary": "API and database health",
        "description": "Access: public. Returns database connectivity in the response body.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        },
        "security": []
      }
    },
    "/api/session/token": {
      "post": {
        "tags": [
          "Authentication"
        ],
        "summary": "Issue a short-lived JWT",
        "description": "Access: authenticated. Use an existing authenticated browser session. Bearer tokens cannot mint new tokens. Token lifetime: 900 seconds or until the linked session is revoked or expires.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      }
    },
    "/api/services": {
      "get": {
        "tags": [
          "Services"
        ],
        "summary": "List active services",
        "description": "Access: public.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "304": {
            "description": "Not modified"
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": []
      }
    },
    "/api/services/categories": {
      "get": {
        "tags": [
          "Services"
        ],
        "summary": "List categories",
        "description": "Access: public.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": []
      }
    },
    "/api/services/category-details": {
      "get": {
        "tags": [
          "Services"
        ],
        "summary": "List category details",
        "description": "Access: public.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": []
      }
    },
    "/api/journal": {
      "get": {
        "tags": [
          "Journal"
        ],
        "summary": "List published articles",
        "description": "Access: public.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        },
        "security": [],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer"
            }
          }
        ]
      }
    },
    "/api/journal/{slug}": {
      "get": {
        "tags": [
          "Journal"
        ],
        "summary": "Read published article",
        "description": "Access: public.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "404": {
            "description": "Not found"
          }
        },
        "security": [],
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/appointments/slots": {
      "get": {
        "tags": [
          "Appointments"
        ],
        "summary": "Check available slots",
        "description": "Access: public. Confirmed appointments block slots. Times use Asia/Dhaka.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "404": {
            "description": "Not found"
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": [],
        "parameters": [
          {
            "name": "serviceId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "date",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    },
    "/api/appointments/mine": {
      "get": {
        "tags": [
          "Appointments"
        ],
        "summary": "List own appointments",
        "description": "Access: customer.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      }
    },
    "/api/appointments/my-summary": {
      "get": {
        "tags": [
          "Appointments"
        ],
        "summary": "Customer overview",
        "description": "Access: customer.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      }
    },
    "/api/appointments": {
      "post": {
        "tags": [
          "Appointments"
        ],
        "summary": "Request appointment",
        "description": "Access: customer.",
        "responses": {
          "201": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "422": {
            "description": "Invalid service price"
          },
          "503": {
            "description": "Temporarily unavailable"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "serviceId": {
                    "type": "string"
                  },
                  "appointmentDate": {
                    "type": "string",
                    "format": "date"
                  },
                  "timeSlot": {
                    "type": "string",
                    "enum": [
                      "09:00",
                      "10:00",
                      "11:00",
                      "12:00",
                      "14:00",
                      "15:00",
                      "16:00",
                      "17:00"
                    ]
                  },
                  "message": {
                    "type": "string",
                    "maxLength": 500
                  }
                },
                "required": [
                  "serviceId",
                  "appointmentDate",
                  "timeSlot"
                ]
              }
            }
          }
        }
      }
    },
    "/api/appointments/{id}/cancel": {
      "patch": {
        "tags": [
          "Appointments"
        ],
        "summary": "Cancel own pending appointment",
        "description": "Access: customer.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "503": {
            "description": "Temporarily unavailable"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/appointments/admin/all": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List appointments",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      }
    },
    "/api/appointments/admin/{id}/status": {
      "patch": {
        "tags": [
          "Administration"
        ],
        "summary": "Confirm or cancel appointment",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "503": {
            "description": "Temporarily unavailable"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "action": {
                    "type": "string",
                    "enum": [
                      "confirm",
                      "cancel"
                    ]
                  }
                },
                "required": [
                  "action"
                ]
              }
            }
          }
        }
      }
    },
    "/api/profile/me": {
      "get": {
        "tags": [
          "Profile"
        ],
        "summary": "Read own profile",
        "description": "Access: authenticated.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Profile"
        ],
        "summary": "Update own profile",
        "description": "Access: authenticated.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "phone": {
                    "type": "string"
                  },
                  "image": {
                    "type": "string"
                  }
                },
                "required": [
                  "name",
                  "phone",
                  "image"
                ]
              }
            }
          }
        }
      }
    },
    "/api/profile/image": {
      "post": {
        "tags": [
          "Profile"
        ],
        "summary": "Upload image",
        "description": "Access: authenticated. Maximum decoded image size: 3 MB.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "image": {
                    "type": "string",
                    "contentEncoding": "base64"
                  },
                  "mime": {
                    "type": "string",
                    "enum": [
                      "image/jpeg",
                      "image/png",
                      "image/webp"
                    ]
                  }
                },
                "required": [
                  "image",
                  "mime"
                ]
              }
            }
          }
        }
      }
    },
    "/api/admin/services/image": {
      "post": {
        "tags": [
          "Administration"
        ],
        "summary": "Upload image",
        "description": "Access: admin. Maximum decoded image size: 5 MB.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "image": {
                    "type": "string",
                    "contentEncoding": "base64"
                  },
                  "mime": {
                    "type": "string",
                    "enum": [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                      "image/gif"
                    ]
                  }
                },
                "required": [
                  "image",
                  "mime"
                ]
              }
            }
          }
        }
      }
    },
    "/api/payments/checkout/{appointmentId}": {
      "post": {
        "tags": [
          "Payments"
        ],
        "summary": "Create Stripe Checkout session",
        "description": "Access: customer. Only confirmed unpaid appointments owned by the customer.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "503": {
            "description": "Temporarily unavailable"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "appointmentId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/payments/receipt/{sessionId}": {
      "get": {
        "tags": [
          "Payments"
        ],
        "summary": "Read verified receipt",
        "description": "Access: customer.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "sessionId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/payments/webhook": {
      "post": {
        "tags": [
          "Payments"
        ],
        "summary": "Receive signed Stripe event",
        "description": "Access: stripe. Stripe only. Raw JSON body and valid Stripe-Signature required. Payment state changes only after verification.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "409": {
            "description": "Conflict"
          },
          "503": {
            "description": "Temporarily unavailable"
          }
        },
        "security": [
          {
            "stripeSignature": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/api/admin/overview": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "Admin overview",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      }
    },
    "/api/admin/users": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List customers",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "all",
                "active",
                "blocked"
              ]
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer"
            }
          }
        ]
      }
    },
    "/api/admin/users/{id}": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "Customer details",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/admin/users/{id}/block": {
      "patch": {
        "tags": [
          "Administration"
        ],
        "summary": "Change customer access",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "isBlocked": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "isBlocked"
                ]
              }
            }
          }
        }
      }
    },
    "/api/admin/transactions": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List transactions",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "all",
                "paid",
                "failed"
              ]
            }
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer"
            }
          }
        ]
      }
    },
    "/api/admin/services": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List all services",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      },
      "post": {
        "tags": [
          "Administration"
        ],
        "summary": "Create service",
        "description": "Access: admin.",
        "responses": {
          "201": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "serviceName": {
                    "type": "string"
                  },
                  "category": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "price": {
                    "type": "number"
                  },
                  "duration": {
                    "type": "integer"
                  },
                  "image": {
                    "type": "string"
                  },
                  "images": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "active",
                      "inactive"
                    ]
                  }
                },
                "required": [
                  "serviceName",
                  "category",
                  "description",
                  "price",
                  "duration",
                  "image"
                ]
              }
            }
          }
        }
      }
    },
    "/api/admin/services/categories": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List categories",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      },
      "post": {
        "tags": [
          "Administration"
        ],
        "summary": "Create category",
        "description": "Access: admin.",
        "responses": {
          "201": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  }
                },
                "required": [
                  "name"
                ]
              }
            }
          }
        }
      }
    },
    "/api/admin/services/category-details": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List category details",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      }
    },
    "/api/admin/services/{id}": {
      "patch": {
        "tags": [
          "Administration"
        ],
        "summary": "Update service",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "serviceName": {
                    "type": "string"
                  },
                  "category": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "price": {
                    "type": "number"
                  },
                  "duration": {
                    "type": "integer"
                  },
                  "image": {
                    "type": "string"
                  },
                  "images": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "active",
                      "inactive"
                    ]
                  }
                },
                "required": [
                  "serviceName",
                  "category",
                  "description",
                  "price",
                  "duration",
                  "image"
                ]
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Administration"
        ],
        "summary": "Delete or archive service",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/admin/services/{id}/status": {
      "patch": {
        "tags": [
          "Administration"
        ],
        "summary": "Change service status",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "active",
                      "inactive"
                    ]
                  }
                },
                "required": [
                  "status"
                ]
              }
            }
          }
        }
      }
    },
    "/api/admin/services/categories/{name}": {
      "patch": {
        "tags": [
          "Administration"
        ],
        "summary": "Update category",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "name",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "image": {
                    "type": "string"
                  }
                },
                "required": [
                  "name",
                  "image"
                ]
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Administration"
        ],
        "summary": "Delete category",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "name",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/api/admin/journal": {
      "get": {
        "tags": [
          "Administration"
        ],
        "summary": "List all articles",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ]
      },
      "post": {
        "tags": [
          "Administration"
        ],
        "summary": "Create article",
        "description": "Access: admin.",
        "responses": {
          "201": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string"
                  },
                  "excerpt": {
                    "type": "string"
                  },
                  "body": {
                    "type": "string"
                  },
                  "category": {
                    "type": "string",
                    "enum": [
                      "Hair Care",
                      "Skin Care",
                      "Nail Care",
                      "Wellness"
                    ]
                  },
                  "image": {
                    "type": "string"
                  },
                  "published": {
                    "type": "boolean"
                  },
                  "featured": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "title",
                  "excerpt",
                  "body",
                  "category",
                  "image",
                  "published",
                  "featured"
                ]
              }
            }
          }
        }
      }
    },
    "/api/admin/journal/{id}": {
      "patch": {
        "tags": [
          "Administration"
        ],
        "summary": "Update article",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string"
                  },
                  "excerpt": {
                    "type": "string"
                  },
                  "body": {
                    "type": "string"
                  },
                  "category": {
                    "type": "string",
                    "enum": [
                      "Hair Care",
                      "Skin Care",
                      "Nail Care",
                      "Wellness"
                    ]
                  },
                  "image": {
                    "type": "string"
                  },
                  "published": {
                    "type": "boolean"
                  },
                  "featured": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "title",
                  "excerpt",
                  "body",
                  "category",
                  "image",
                  "published",
                  "featured"
                ]
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Administration"
        ],
        "summary": "Delete article",
        "description": "Access: admin.",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "401": {
            "description": "Authentication required"
          },
          "403": {
            "description": "Access denied"
          },
          "404": {
            "description": "Not found"
          },
          "409": {
            "description": "Conflict"
          }
        },
        "security": [
          {
            "bearerAuth": []
          },
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      },
      "sessionCookie": {
        "type": "apiKey",
        "in": "cookie",
        "name": "better-auth.session_token",
        "description": "Better Auth session cookie; production may use a secure-prefixed name."
      },
      "stripeSignature": {
        "type": "apiKey",
        "in": "header",
        "name": "Stripe-Signature"
      }
    }
  }
};
