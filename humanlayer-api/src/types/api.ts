// API-specific types (requests/responses wrapping domain models)
import { FunctionCall, HumanContact, Escalation } from './models.js'

export interface CreateFunctionCallRequest {
  body: FunctionCall
}

export interface CreateFunctionCallResponse {
  data: FunctionCall
}

export interface GetFunctionCallResponse {
  data: FunctionCall
}

export interface RespondToFunctionCallRequest {
  params: { call_id: string }
  body: {
    requested_at: string
    responded_at: string
    approved: boolean
    comment?: string
  }
}

export interface EscalateFunctionCallRequest {
  params: { call_id: string }
  body: Escalation
}

// Similar for HumanContact endpoints...
export interface CreateHumanContactRequest {
  body: HumanContact
}

export interface CreateHumanContactResponse {
  data: HumanContact
}

export interface GetHumanContactResponse {
  data: HumanContact
}

export interface RespondToHumanContactRequest {
  params: { call_id: string }
  body: {
    requested_at?: string
    responded_at: string
    response: string
    response_option_name?: string
  }
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}
