// Cal.id / Cal.com API Client
// Centralized client for all calendar API operations

export interface CalBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  eventTypeId?: number;
  eventType?: {
    id?: number;
    title: string;
    slug: string;
    length: number;
    price?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  };
  user?: { name: string; email: string; id?: number };
  userPrimaryEmail?: string;
  attendees?: Array<{ name: string; email: string; timeZone?: string; phoneNumber?: string; locale?: string }>;
  responses?: Record<string, any>;
  location?: string;
  metadata?: Record<string, unknown>;
  paid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalEventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number;
  hidden: boolean;
  position: number;
  locations?: Array<{ type: string; address?: string }>;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  price?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface CalSchedule {
  id: number;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availability: Array<{
    days: number[];
    startTime: string;
    endTime: string;
  }>;
}

export interface CalUser {
  id: number;
  username: string;
  name: string;
  email: string;
  timeZone?: string;
  avatar?: string;
}

export interface CreateBookingPayload {
  eventTypeId: number;
  start: string;
  end: string;
  name: string;
  email: string;
  timeZone?: string;
  language?: string;
  metadata?: Record<string, unknown>;
  location?: string;
}

export interface CreateEventTypePayload {
  title: string;
  slug?: string;
  description?: string;
  length: number;
  locations?: Array<{ type: string; address?: string }>;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  hidden?: boolean;
}

export interface UpdateEventTypePayload {
  title?: string;
  description?: string;
  length?: number;
  locations?: Array<{ type: string; address?: string }>;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  hidden?: boolean;
}

export interface CreateSchedulePayload {
  name: string;
  timeZone: string;
  isDefault?: boolean;
  availability?: Array<{
    days: number[];
    startTime: string;
    endTime: string;
  }>;
}

export interface UpdateSchedulePayload {
  name?: string;
  timeZone?: string;
  isDefault?: boolean;
  availability?: Array<{
    days: number[];
    startTime: string;
    endTime: string;
  }>;
}

class CalApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public responseBody?: string
  ) {
    super(message);
    this.name = "CalApiError";
  }
}

export class CalComClient {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries: number;

  constructor(apiKey: string, maxRetries = 2) {
    this.apiKey = apiKey;
    this.maxRetries = maxRetries;

    // Cal.id is the primary backend
    if (apiKey.startsWith("calid_")) {
      this.baseUrl = "https://api.cal.id";
    } else {
      this.baseUrl = "https://api.cal.com/v1";
    }
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      params?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, params } = options;

    let url: string;
    if (this.apiKey.startsWith("calid_")) {
      // Cal.id uses Bearer auth and different URL structure
      const searchParams = new URLSearchParams(params || {});
      const queryString = searchParams.toString();
      url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ""}`;
    } else {
      // Cal.com v1 uses apiKey query param
      const searchParams = new URLSearchParams({
        apiKey: this.apiKey,
        ...(params || {}),
      });
      url = `${this.baseUrl}${path}?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey.startsWith("calid_")) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
        });

        if (res.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(res.headers.get("retry-after") || "2");
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new CalApiError(res.status, `API error ${res.status}: ${errorText}`, errorText);
        }

        const data = await res.json();
        return data;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof CalApiError && err.statusCode < 500) {
          throw err; // Don't retry client errors
        }
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  // ─── User ──────────────────────────────────────────────
  async getMe(): Promise<CalUser> {
    if (this.apiKey.startsWith("calid_")) {
      // Cal.id doesn't have /me - validate by fetching bookings
      const data = await this.request<any>("/booking");
      if (data.success === false) throw new Error("Invalid API key");
      return { id: 0, username: "calid_user", name: "Calendar User", email: "" };
    }
    const data = await this.request<{ user: CalUser }>("/users/me");
    return data.user;
  }

  // ─── Bookings ──────────────────────────────────────────
  async getBookings(params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
  }): Promise<CalBooking[]> {
    const queryParams: Record<string, string> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params?.dateTo) queryParams.dateTo = params.dateTo;
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.page) queryParams.page = params.page.toString();

    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>("/booking", { params: queryParams });
      const bookings = Array.isArray(data) ? data : data.data || data.bookings || [];
      return bookings;
    }

    const data = await this.request<{ bookings: CalBooking[] }>("/bookings", { params: queryParams });
    return data.bookings || [];
  }

  async getBooking(id: number | string): Promise<CalBooking> {
    if (this.apiKey.startsWith("calid_")) {
      // Single booking endpoint loses `responses`, so fetch from list with id filter
      // which preserves all custom field data
      try {
        const listData = await this.request<any>("/booking", { params: { id: String(id) } });
        const bookings = Array.isArray(listData) ? listData : listData.data || [];
        if (bookings.length > 0 && bookings[0].responses) {
          return bookings[0];
        }
      } catch { /* fall back to single endpoint */ }
      const data = await this.request<any>(`/booking/${id}`);
      return data.data || data;
    }
    const data = await this.request<{ booking: CalBooking }>(`/bookings/${id}`);
    return data.booking;
  }

  async createBooking(payload: CreateBookingPayload): Promise<CalBooking> {
    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>("/booking", { method: "POST", body: payload });
      return data.data || data;
    }
    const data = await this.request<any>("/bookings", { method: "POST", body: payload });
    return data;
  }

  async cancelBooking(id: number | string, reason?: string): Promise<void> {
    if (this.apiKey.startsWith("calid_")) {
      // Cal.id requires a non-empty JSON body for cancel
      await this.request<any>(`/booking/${id}/cancel`, {
        method: "POST",
        body: { allRemainingBookings: false, cancellationReason: reason || "" },
      });
      return;
    }
    await this.request<any>(`/bookings/${id}/cancel`, {
      method: "DELETE",
      body: reason ? { reason } : undefined,
    });
  }

  async updateBooking(
    id: number | string,
    payload: { status?: string; startTime?: string; endTime?: string }
  ): Promise<CalBooking> {
    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>(`/booking/${id}`, { method: "PATCH", body: payload });
      return data.data || data;
    }
    const data = await this.request<any>(`/bookings/${id}`, { method: "PATCH", body: payload });
    return data;
  }

  // ─── Event Types ───────────────────────────────────────
  async getEventTypes(): Promise<CalEventType[]> {
    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>("/event-types");
      const eventTypes = Array.isArray(data) ? data : data.data || data.event_types || data.eventTypes || [];
      return eventTypes;
    }
    const data = await this.request<{ event_types: CalEventType[] }>("/event-types");
    return data.event_types || [];
  }

  async getEventType(id: number): Promise<CalEventType> {
    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>(`/event-types/${id}`);
      return data.data || data;
    }
    const data = await this.request<{ event_type: CalEventType }>(`/event-types/${id}`);
    return data.event_type;
  }

  async createEventType(payload: CreateEventTypePayload): Promise<CalEventType> {
    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>("/event-types", { method: "POST", body: payload });
      return data.data || data;
    }
    const data = await this.request<{ event_type: CalEventType }>("/event-types", { method: "POST", body: payload });
    return data.event_type;
  }

  async updateEventType(id: number, payload: UpdateEventTypePayload): Promise<CalEventType> {
    if (this.apiKey.startsWith("calid_")) {
      const data = await this.request<any>(`/event-types/${id}`, { method: "PATCH", body: payload });
      return data.data || data;
    }
    const data = await this.request<{ event_type: CalEventType }>(`/event-types/${id}`, { method: "PATCH", body: payload });
    return data.event_type;
  }

  async deleteEventType(id: number): Promise<void> {
    await this.request<any>(
      this.apiKey.startsWith("calid_") ? `/event-types/${id}` : `/event-types/${id}`,
      { method: "DELETE" }
    );
  }

  // ─── Schedules ─────────────────────────────────────────
  // Note: Cal.id does NOT support /schedules. Use getAvailability() instead.
  async getSchedules(): Promise<CalSchedule[]> {
    if (this.apiKey.startsWith("calid_")) {
      // Cal.id has no /schedules endpoint - derive from /availability
      try {
        const data = await this.getAvailability({
          dateFrom: new Date().toISOString().split("T")[0],
          dateTo: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        });
        const avail = data.data || data;
        if (avail.workingHours && avail.workingHours.length > 0) {
          return [{
            id: 0,
            name: "Default Schedule",
            timeZone: avail.timeZone || "UTC",
            isDefault: true,
            availability: avail.workingHours.map((wh: any) => ({
              days: wh.days,
              startTime: `${String(Math.floor(wh.startTime / 60)).padStart(2, "0")}:${String(wh.startTime % 60).padStart(2, "0")}`,
              endTime: `${String(Math.floor(wh.endTime / 60)).padStart(2, "0")}:${String(wh.endTime % 60).padStart(2, "0")}`,
            })),
          }];
        }
      } catch { /* fall through */ }
      return [];
    }
    const data = await this.request<{ schedules: CalSchedule[] }>("/schedules");
    return data.schedules || [];
  }

  async createSchedule(payload: CreateSchedulePayload): Promise<CalSchedule> {
    if (this.apiKey.startsWith("calid_")) {
      throw new CalApiError(501, "Schedule management is not supported on this integration. Use event type settings instead.");
    }
    const data = await this.request<{ schedule: CalSchedule }>("/schedules", { method: "POST", body: payload });
    return data.schedule;
  }

  async updateSchedule(id: number, payload: UpdateSchedulePayload): Promise<CalSchedule> {
    if (this.apiKey.startsWith("calid_")) {
      throw new CalApiError(501, "Schedule management is not supported on this integration. Use event type settings instead.");
    }
    const data = await this.request<{ schedule: CalSchedule }>(`/schedules/${id}`, { method: "PATCH", body: payload });
    return data.schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    if (this.apiKey.startsWith("calid_")) {
      throw new CalApiError(501, "Schedule management is not supported on this integration.");
    }
    await this.request<any>(`/schedules/${id}`, { method: "DELETE" });
  }

  // ─── Webhooks ──────────────────────────────────────────
  async createWebhook(payload: {
    subscriberUrl: string;
    eventTriggers: string[];
    active?: boolean;
  }): Promise<any> {
    if (this.apiKey.startsWith("calid_")) {
      // Try Cal.id webhook endpoints — may or may not be supported
      const body = {
        subscriberUrl: payload.subscriberUrl,
        eventTriggers: payload.eventTriggers,
        active: payload.active !== false,
      };
      // Try /webhooks first, then /hooks
      for (const path of ["/webhooks", "/hooks"]) {
        try {
          const data = await this.request<any>(path, { method: "POST", body });
          return data?.data || data;
        } catch (err: any) {
          // 404 means endpoint doesn't exist, try next
          if (err?.statusCode === 404) continue;
          // 409 means webhook already exists — that's fine
          if (err?.statusCode === 409) return { alreadyExists: true };
          // Other errors — try next path
          continue;
        }
      }
      // Cal.id doesn't support webhooks — return null (rely on polling sync)
      console.log("Cal.id webhook registration not available — using polling sync");
      return null;
    }
    const data = await this.request<any>("/hooks", { method: "POST", body: payload });
    return data;
  }

  async getWebhooks(): Promise<any[]> {
    if (this.apiKey.startsWith("calid_")) {
      for (const path of ["/webhooks", "/hooks"]) {
        try {
          const data = await this.request<any>(path);
          const hooks = Array.isArray(data) ? data : data?.data || data?.webhooks || [];
          return hooks;
        } catch { continue; }
      }
      return [];
    }
    const data = await this.request<any>("/hooks");
    return Array.isArray(data) ? data : data.data || data.webhooks || [];
  }

  async deleteWebhook(id: number | string): Promise<void> {
    if (this.apiKey.startsWith("calid_")) {
      for (const path of [`/webhooks/${id}`, `/hooks/${id}`]) {
        try {
          await this.request<any>(path, { method: "DELETE" });
          return;
        } catch { continue; }
      }
      return;
    }
    await this.request<any>(`/hooks/${id}`, { method: "DELETE" });
  }

  // ─── Availability ─────────────────────────────────────
  async getAvailability(params: {
    eventTypeId?: number;
    dateFrom: string;
    dateTo: string;
    timeZone?: string;
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };
    if (params.eventTypeId) queryParams.eventTypeId = params.eventTypeId.toString();
    if (params.timeZone) queryParams.timeZone = params.timeZone;

    const data = await this.request<any>("/availability", { params: queryParams });
    // Cal.id wraps in { success, data }, Cal.com returns directly
    return data.data || data;
  }
}

// ─── Booking Field Labels ────────────────────────────────
// Fetches the real question labels from the Cal.id public booking page
export interface BookingFieldDef {
  name: string;        // slug key used in responses (e.g. "Desired-Outcome")
  type: string;        // field type (text, textarea, phone, radioInput, etc.)
  label: string;       // actual question label (e.g. "Desired Outcome")
  required: boolean;
  editable: string;    // system, system-but-optional, user
}

/**
 * Fetch booking field definitions from the Cal.id public booking page.
 * The Cal.id API doesn't expose bookingFields, but the public booking page
 * embeds them in its HTML/JSON payload.
 *
 * @param profileSlug - e.g. "bold-labs"
 * @param eventSlug - e.g. "service-booking"
 * @returns Array of field definitions with exact labels
 */
export async function fetchBookingFieldLabels(
  profileSlug: string,
  eventSlug: string
): Promise<BookingFieldDef[]> {
  const url = `https://cal.id/${profileSlug}/${eventSlug}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Find bookingFields JSON embedded in the page
    const marker = "bookingFields";
    const idx = html.indexOf(marker);
    if (idx === -1) return [];

    const afterMarker = html.slice(idx, idx + 15000);
    const arrStart = afterMarker.indexOf("[");
    if (arrStart === -1) return [];

    const chunk = afterMarker.slice(arrStart);

    // Find matching closing bracket (accounting for escaped content)
    let depth = 0;
    let end = -1;
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] === "[") depth++;
      if (chunk[i] === "]") depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    if (end === -1) return [];

    const rawArr = chunk.slice(0, end);
    let fields: any[];
    try {
      fields = JSON.parse(rawArr);
    } catch {
      // Try unescaping (content may be inside a JSON string)
      try {
        const unescaped = rawArr.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        fields = JSON.parse(unescaped);
      } catch {
        return [];
      }
    }

    // Default label translations for system fields
    const defaultLabelMap: Record<string, string> = {
      your_name: "Your Name",
      email_address: "Email Address",
      phone_number: "Phone Number",
      location: "Location",
      what_is_this_meeting_about: "What is this meeting about?",
      additional_notes: "Additional Notes",
      additional_guests: "Additional Guests",
      reason_for_reschedule: "Reason for Rescheduling",
    };

    return fields.map((f: any) => ({
      name: f.name,
      type: f.type || "text",
      label: f.label || defaultLabelMap[f.defaultLabel] || formatSlugToLabel(f.name),
      required: !!f.required,
      editable: f.editable || "user",
    }));
  } catch {
    return [];
  }
}

/**
 * Discover the Cal.id profile slug for a given API key by checking bookings.
 * The profile slug is needed to fetch the public booking page.
 */
export async function discoverProfileSlug(client: CalComClient): Promise<string | null> {
  try {
    const bookings = await client.getBookings({ limit: 1 });
    if (bookings.length === 0) return null;
    const userName = bookings[0].user?.name;
    if (!userName) return null;
    // Cal.id typically uses kebab-case of the user name
    return userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  } catch {
    return null;
  }
}

/** Convert a slug/key to a readable label */
export function formatSlugToLabel(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// Helper to create a client from a stored connection
export function createCalClient(accessToken: string): CalComClient {
  return new CalComClient(accessToken);
}
