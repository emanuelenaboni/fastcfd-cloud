# Report contract

FastCFD can generate reports whenever a simulation has produced a field and metrics. Convergence is not an export gate.

## Output classes

- HTML technical and weather reports.
- Plan, isometric, section, and campaign PNG plates.
- CSV metrics and campaign comparisons.
- `.fcfd.json` reproducibility packages.
- QA and report manifests.
- OBJ massing exports and saved visualization presets.

## Mandatory status disclosure

Every quantitative report must include, when available:

- solver name and dimensionality;
- grid size and cell count;
- steps or flow-throughs;
- convergence flag;
- residual and reference threshold;
- result/geometry validation warnings;
- model and climate limitations.

A non-converged report is allowed and must be visibly labelled `PROVISIONAL / NON-CONVERGED`. This label informs interpretation but does not prevent report production or Drive upload.

## Drive naming

The user's Drive folder is `FastCFD Cloud Reports`. Existing report filenames are preserved after unsafe filesystem characters are replaced. Each upload records `producer=FastCFD Urban Studio` and `fastcfdVersion=3.24.7` in Drive app properties.

## Failure policy

No generated artifact may be silently discarded. If Drive is disconnected or an upload fails, FastCFD downloads the file through the browser and displays a warning.
