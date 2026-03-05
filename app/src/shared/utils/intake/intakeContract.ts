export interface IntakeResult {
    contactId: string;
    originId: string;
    followUpId: string;
  }
  
  export interface IntakePayload {
    contact: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      location?: string | null;
    };
  
    followUp: {
      status?: string;
      notes?: string | null;
      source?: string | null;
      automationEligible?: boolean;
      permissionToContact?: boolean;
    };
  
    rawPayload?: any;
  }