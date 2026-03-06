import type { IEgg } from "../types/egg";
import { invisibleHand } from "./InvisibleHand";
import { incidentMailto } from "./IncidentMailto";
import { canaryWing } from "./CanaryWing";

/** All eggs available for the processor. Use with payloads keyed by egg.id. */
export const AVAILABLE_EGGS: IEgg[] = [invisibleHand, incidentMailto, canaryWing];
