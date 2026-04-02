/**
 * Extract phone number from booking metadata.
 * Cal.id stores it in multiple places depending on API version.
 */
export function extractPhone(metadata: any): string | null {
    if (!metadata) return null;
    // responses.attendeePhoneNumber is the primary location
    const fromResponses = metadata.responses?.attendeePhoneNumber;
    if (fromResponses) return Array.isArray(fromResponses) ? fromResponses[0] : String(fromResponses);
    // attendees[0].phoneNumber is the fallback
    const fromAttendee = metadata.attendees?.[0]?.phoneNumber;
    if (fromAttendee) return String(fromAttendee);
    // Legacy field names
    const legacy = metadata.responses?.phone || metadata.responses?.Phone || metadata.phone;
    if (legacy) return Array.isArray(legacy) ? legacy[0] : String(legacy);
    return null;
}

/**
 * Extract location from booking metadata.
 */
export function extractLocation(metadata: any): string | null {
    if (!metadata) return null;
    // Direct location string
    if (typeof metadata.location === "string" && metadata.location) return metadata.location;
    // From responses (attendeeInPerson format)
    const loc = metadata.responses?.location;
    if (typeof loc === "string") return loc;
    if (loc?.optionValue) return String(loc.optionValue);
    return null;
}
