# Knowledge sources and release policy

Last reviewed: 23 August 2026

The bundled knowledge directory is a small, versioned allow-list. It gives the model concise context and gives application validation stable rule/service IDs. It is not a substitute for the underlying law, professional advice, laboratory testing, or an official registry response. A package image can support observations about readable label content; it cannot establish composition, authenticity, licensing status, or a formal regulatory conclusion.

## Enabled official rule packs

| Stable ID | Scope | Primary source | Important boundary |
|---|---|---|---|
| `in.fssai.labelling-display-2020.v1` | Food, beverages and limited general supplement-label context | [FSSAI Gazette notification archive: Labelling and Display Regulations, 2020](https://fssai.gov.in/notifications.php?pages=16) | Later amendments and product-specific rules may apply; unseen panels are unknown, not missing. |
| `in.legal-metrology.packaged-commodities-2011.v1` | General retail pre-package declarations across supported categories | [Department of Consumer Affairs consolidated Packaged Commodities Rules](https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/LM_PCR_All_Amendements.pdf) | Exemptions and package/transaction type require case-specific review. |
| `in.cdsco.cosmetics-rules-2020-labelling.v1` | Visible labelling context for products that are cosmetics | [CDSCO Cosmetics Rules, 2020](https://www.cdsco.gov.in/opencms/en/Acts-and-rules/Cosmetics-Rules/) | No formulation, licensing-validity, import-registration, prohibited-ingredient, or borderline-classification determination. |

## Experimental pack

`experimental.in.fssai.inr-draft-2022.v1` is based on FSSAI's [September 2022 draft Labelling and Display amendment](https://www.fssai.gov.in/upload/uploadfiles/files/Draft_Notification_HFSS_20_09_2022.pdf). It has no effective date and is not treated as enacted law or a current official product rating. Any INR illustration must be labelled experimental, separated from official findings, omitted when required inputs or exemptions are uncertain, and never used as a grievance ground or overall product verdict.

## Allow-listed consumer services

| Stable ID | Route only when | Official handoff |
|---|---|---|
| `in.fssai.foscos.v1` | A food matter fits the official portal scope; exact FSSAI number is required for lookup. | [Food Safety Connect](https://foscos.fssai.gov.in/consumergrievance/) |
| `in.bis.care.v1` | A matching CM/L, R-number or HUID is visible/user-entered, or the issue concerns a BIS mark/certified product. | [BIS Care](https://www.bis.gov.in/bis-apps/?lang=en) |
| `in.consumer-affairs.nch.v1` | A general consumer transaction grievance needs a broad pre-litigation channel. | [National Consumer Helpline](https://consumerhelpline.gov.in/) |

These are external handoffs only. Front of Pack does not call a government registry, verify identifiers, authenticate official status, submit grievances, create docket numbers, or track cases. The user reviews and submits any editable grievance draft on the official service.

## Updating the packs

Before enabling a new or revised ID, review a current primary government source, record its access/effective dates and limitations, increment the versioned stable ID when semantics change, and intentionally update the enabled-ID test snapshot. Drafts remain in the `experimental.` namespace with `label_only` coverage and a null effective date. Automated tests reject duplicate IDs, incomplete/non-HTTPS sources, and experimental overclaiming.
