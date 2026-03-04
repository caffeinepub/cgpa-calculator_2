# CGPA Calculator — AI Image Analysis Upgrade

## Current State
- Fully working CGPA Calculator with dark glassmorphism design
- Manual subject entry: each row has grade (number or letter dropdown) + credit input
- Backend: Motoko `calculate(grades)` and `gradeToPoint(letterGrade)` functions
- Frontend: dynamic add/remove subject rows, validation, animated result card with classification badge
- Credits accept decimals (0.5, 1.5) and zero-credit subjects

## Requested Changes (Diff)

### Add
- **Image upload flow**: Student can upload a photo of their result/marksheet instead of manually typing grades
- **AI image analysis**: Backend sends the uploaded image to an external AI vision API (Google Gemini vision) via HTTP outcall, which extracts all subject grades and credits from the image
- **"Analyse & Calculate" button**: One-click button that uploads the image, calls the AI analysis, fills in subjects, and calculates CGPA instantly
- **Image preview**: Show a thumbnail of the uploaded image before analysis
- **Extracted subjects preview**: After AI analysis, show the detected subjects/grades/credits in the existing table so the student can verify or edit before final calculation
- **Tab/mode switcher**: Two modes — "Manual Entry" (existing) and "Upload Result" (new image flow)
- **http-outcalls** Caffeine component for backend HTTP calls to AI vision API

### Modify
- Backend: add `analyseResultImage(imageBase64: Text, mimeType: Text)` function that calls Gemini vision API and returns extracted subjects as JSON text
- Frontend App.tsx: add tab switcher between manual and image modes; add image upload section; wire AI analysis flow

### Remove
- Nothing removed; existing manual entry remains fully functional

## Implementation Plan
1. Select `http-outcalls` component
2. Generate new Motoko backend with `analyseResultImage` function using HTTP outcalls to Gemini API
3. Frontend: add tab switcher UI (Manual Entry / Upload Result)
4. Frontend: image upload dropzone with preview thumbnail
5. Frontend: "Analyse & Calculate" button that calls backend, parses returned JSON, fills subject rows, and triggers CGPA calculation
6. Frontend: loading state while AI is processing image
7. Frontend: error handling if image cannot be parsed (e.g. blurry, unsupported format)
8. Keep all existing manual entry functionality intact
