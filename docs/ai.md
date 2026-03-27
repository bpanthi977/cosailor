# AI Service

Uses OpenRouter via `@openrouter/sdk` for LLM.

## Tools

| Tool | Signature | Description |
|------|-----------|-------------|
| `fetch_notes` | `(customer_name: string)` | Returns notes and profile for a customer |
| `save_note` | `(customer_name: string, text: string)` | Logs a note for a customer |
| `list_customers` | `()` | Returns all customers owned by the rep |

In production the tools would be handled in the backend size with connection to other info from CRM/ERP API. For current prototype, the tools are implemented by the client and read/write to the SQLite database.
