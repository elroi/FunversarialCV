export enum OwaspMapping {
    LLM01_Prompt_Injection = "LLM01: Direct Prompt Injection",
    LLM02_Insecure_Output = "LLM02: Insecure Output Handling",
    LLM10_Model_Theft = "LLM10: Model Theft & Exfiltration",
    CREATIVE_HANDSHAKE = "Creative: Technical Handshake"
  }
  
  export interface IEgg {
    id: string;
    name: string;
    description: string;
    owaspMapping: OwaspMapping;

    /**
     * Human-readable instructions:
     * - How to manually check that this egg is present in the output document.
     * - How to validate that the egg has been implemented correctly.
     */
    manualCheckAndValidation: string;
    
    /**
     * Transforms the document buffer.
     * Processes only 'dehydrated' text to maintain privacy.
     */
    transform: (buffer: Buffer, payload: string) => Promise<Buffer>;
    
    /**
     * Validates that the payload doesn't contain actual exploit code.
     */
    validatePayload: (payload: string) => boolean;
  }