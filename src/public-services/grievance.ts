import { SERVICE_DIRECTORY } from "../knowledge/service-directory.ts";

export const GRIEVANCE_NOTICE = "Editable draft only. Front of Pack does not submit, register, or track this grievance.";

export interface GrievanceFacts { product: string; issue: string; purchaseDetails: string; requestedResolution: string; serviceId: string; }

export function grievanceServicesForCategory(category: string) {
  return SERVICE_DIRECTORY.filter((service) => (service.categories as readonly string[]).includes(category));
}

export function buildGrievanceDraft(facts: GrievanceFacts): string {
  const service = SERVICE_DIRECTORY.find((entry) => entry.id === facts.serviceId);
  if (!service) throw new Error("Choose a service from the verified directory.");
  const clean = (value: string) => value.trim() || "Not provided";
  return [`To: ${service.title}`, "", "Subject: Consumer grievance draft", "", `Product: ${clean(facts.product)}`, `Issue (confirmed by me): ${clean(facts.issue)}`, `Purchase details: ${clean(facts.purchaseDetails)}`, `Resolution requested: ${clean(facts.requestedResolution)}`, "", GRIEVANCE_NOTICE, `Submit yourself at: ${service.url}`].join("\n");
}
