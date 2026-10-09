# ABDM preparation module

Open **ABDM & ABHA** in the sidebar. The module supports the Round 1 requirement of mock ABHA linking and FHIR-style records. It is not connected to government services.

## Working features

- Existing account-scoped mock-link state persists in D1; the sample profile stays fictional.
- Select one saved or sample record; inspect review, source, name, date and uncertainty checks.
- Review the transcription in My records before downloading a draft.
- The authenticated `GET /api/health/records/:id/abdm-document` endpoint checks record ownership and review state before exporting. Unknown record ownership returns 404, unreviewed records return 409.
- The export is an R4-style document Bundle with identifier, timestamp, Composition first, one Patient, software Device author and internally resolved references to source/extracted resources.
- The Composition stays preliminary. No clinician identity or verified health identifier is invented. Mock identifiers appear only for synthetic records and remain in a clearly fictional namespace.
- The export acknowledgement means local download only. It is not an ABDM Consent artefact and does not authorize remote sharing. No ABDM network request occurs.

## Standards boundary

The [NRCeS DocumentBundle profile](https://nrces.in/ndhm/fhir/r4/StructureDefinition-DocumentBundle.html) requires a document bundle with a Composition first, identifier and timestamp. We use that document organization but do not declare `meta.profile` conformance. The draft uses uncoded source text and a software author; authoritative clinical authorship, terminology and target-profile constraints are not yet satisfied or validated. A passed preparation check is not FHIR validation.

## Real sandbox integration remains

Register the application in the [official ABDM Sandbox](https://sandbox.abdm.gov.in/). Keep approved client credentials server-side. Implement the current official ABHA verification flow, patient matching, HIP/HIU and care-context workflows, consent management callbacks, revocation/expiry enforcement and prescribed encrypted health-information exchange. Validate mapped resources against the selected [NRCeS implementation guide](https://nrces.in/ndhm/fhir/r4/) and complete the applicable sandbox assessments before claiming integration.

Do not add fake OTP verification, accept a typed ABHA number as proof of identity, or forward these unvalidated drafts to the ABDM network.

## Verification

`node scripts/test-abdm.mjs` checks document structure, review gating, reference integrity, source-patient isolation, narrative escaping and the absence of false conformance claims. `node scripts/test-local.mjs` additionally verifies the authenticated endpoint and cross-account denial against the locally running built Worker.
