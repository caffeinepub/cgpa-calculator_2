# CricOracle.AI — CGPA Calculator

## Current State
New project. No existing frontend or backend code.

## Requested Changes (Diff)

### Add
- Backend: `calculate` endpoint accepting an array of subjects (grade + credit), returning CGPA rounded to 2 decimal places
- Backend: Grade-to-point conversion (O=10, A+=9, A=8, B+=7, B=6, C=5)
- Frontend: Single-page CGPA Calculator app with dynamic subject rows
- Frontend: Each row has a grade input (toggle between numeric 0–10 and letter-grade dropdown) and a credit number input
- Frontend: Add Subject / Remove Subject row controls
- Frontend: Calculate CGPA button that calls backend and displays result
- Frontend: Input validation (no empty fields, valid ranges)
- Frontend: Loading state during calculation
- Frontend: Error state display
- Frontend: Smooth animations for adding/removing rows and showing result
- Frontend: Result displayed in a highlighted card

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Generate Motoko backend with `calculate` function accepting subjects array, returning Float CGPA
2. Build React frontend:
   - SubjectRow component with grade mode toggle (number input vs dropdown) and credit input
   - Dynamic list of SubjectRow components (add/remove)
   - Calculate button with loading state wired to backend
   - Result display card with animation
   - Full input validation and error messaging
   - Mobile-responsive centered card layout with glassmorphism/dark theme
