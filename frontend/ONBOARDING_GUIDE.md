# PropFlow Onboarding Guide

## Overview

PropFlow includes a comprehensive onboarding system designed to help new users get the most out of the CRM. It consists of two main components:

### 1. **Feature Tour** (Interactive Step-by-Step Guide)
- **Location**: `src/components/onboarding/FeatureTour.tsx`
- **When it appears**: On first visit after login/signup
- **Features**:
  - 10-step interactive tour highlighting all major features
  - Aesthetic blue arrows pointing to navigation items
  - Spotlight highlight effect on active elements
  - Progress indicator at the bottom
  - Ability to skip, go back, or continue
  - Tracks completion using browser localStorage

#### Tour Steps:
1. Welcome to PropFlow
2. Dashboard overview
3. Leads management
4. Sales Pipeline (Kanban board)
5. Projects & Inventory
6. Finance & Billing
7. Task Management
8. Contact Directory
9. Notifications
10. Settings & Team Configuration

**How to Reset Tour**: Clear `propflow-tour-seen` from localStorage
```javascript
localStorage.removeItem("propflow-tour-seen")
```

### 2. **Onboarding Checklist** (Task-Based Getting Started)
- **Location**: `src/components/onboarding/OnboardingChecklist.tsx`
- **Where it appears**: Top of the Dashboard page
- **Features**:
  - Visual progress bar
  - 4 key setup tasks
  - Quick-start buttons linking to each feature
  - Minimizable interface
  - Auto-dismissible when completed
  - Tracks completion using localStorage

#### Checklist Items:
1. ✓ Add Your First Lead
2. ✓ Invite Team Members
3. ✓ Create a Project
4. ✓ Create a Quotation

**How to Reset Checklist**: Clear these localStorage keys
```javascript
localStorage.removeItem("onboarding-lead-added")
localStorage.removeItem("onboarding-team-invited")
localStorage.removeItem("onboarding-project-created")
localStorage.removeItem("onboarding-quotation-created")
localStorage.removeItem("onboarding-checklist-dismissed")
```

## Implementation Details

### Feature Tour Component
- Uses `document.querySelector()` to find navigation elements
- Calculates element position and creates spotlight effect
- Renders SVG arrows pointing to target elements
- Responsive tooltip positioning (top, bottom, left, right)
- Overlay prevents interaction with page behind tour

### Onboarding Checklist Component
- Appears only on Dashboard page
- Automatically hidden when all tasks are completed
- Can be minimized to reduce visual clutter
- Progress bar updates in real-time
- Dismissible with X button

## Tracking Completion

### In the Backend
To properly track user onboarding status, add these fields to the User model:

```python
class User(Base):
    __tablename__ = "users"
    
    id: int = Column(Integer, primary_key=True)
    # ... existing fields ...
    
    # Onboarding tracking
    tour_completed: bool = Column(Boolean, default=False)
    checklist_completed: bool = Column(Boolean, default=False)
    first_lead_added: bool = Column(Boolean, default=False)
    first_project_created: bool = Column(Boolean, default=False)
    team_invited: bool = Column(Boolean, default=False)
```

Then create an API endpoint to update these:
```python
@router.patch("/users/{user_id}/onboarding")
async def update_onboarding_status(user_id: int, status: OnboardingStatus):
    user = await db.query(User).filter(User.id == user_id).first()
    user.tour_completed = status.tour_completed
    user.checklist_completed = status.checklist_completed
    await db.commit()
    return user
```

### In the Frontend
Option 1: Pure localStorage (Current implementation)
- Simple, no backend calls needed
- Works offline
- Resets when user clears cache

Option 2: Sync with backend
```typescript
async function updateOnboardingProgress(taskId: string) {
  const response = await api.patch(`/users/me/onboarding`, {
    [taskId]: true
  })
  localStorage.setItem(`onboarding-${taskId}`, "true")
}
```

## Customization

### Adding New Tour Steps
Edit `src/components/onboarding/FeatureTour.tsx`:

```typescript
const tourSteps: TourStep[] = [
  // ... existing steps ...
  {
    id: "new-feature",
    title: "New Feature Title",
    description: "Description of what this feature does...",
    targetSelector: "a[href='/new-feature']", // CSS selector for element
    position: "right", // top, bottom, left, right
  }
]
```

### Styling
Both components use Tailwind CSS. Key colors:
- Primary: `blue-500` through `blue-600`
- Accents: `indigo-600`
- Text: `gray-900` (dark), `gray-600` (medium)
- Background: `blue-50` (light backgrounds)

Modify the TailwindCSS classes in the components to match your brand colors.

### Disabling Onboarding
To hide both components:
```typescript
// In FeatureTour.tsx
if (true) return null // Disable feature tour

// In OnboardingChecklist.tsx
if (true) return null // Disable checklist
```

## User Experience Flow

1. **User Signs Up**
   - Redirected to OnboardingPage to create organization
   - Organization created successfully

2. **User First Login**
   - Lands on Dashboard
   - OnboardingChecklist appears at top
   - FeatureTour starts automatically

3. **Tour Navigation**
   - User walks through 10 steps of main features
   - Can skip, go back, or continue
   - Tour completion saved to localStorage

4. **Checklist Progress**
   - User can minimize or dismiss checklist
   - Checklist items link directly to relevant pages
   - As user completes tasks, checklist updates

5. **Task Tracking**
   - Tasks can be marked complete via:
     - localStorage flags
     - User actions detected (auto-mark when actions are taken)
     - Manual API calls to backend

## Analytics & Improvements

### Metrics to Track
- % of users who complete feature tour
- % of users who complete checklist
- Drop-off points in tour (which steps users skip)
- Time spent on each step
- Most accessed features after onboarding

### Suggested Enhancements
1. **Auto-completion**: Automatically mark checklist items when user performs actions
2. **Contextual Help**: Show mini-tooltips on feature pages
3. **Video Tutorials**: Embed short videos in tour steps
4. **Onboarding Emails**: Send follow-up emails with tips
5. **Role-based Tours**: Different tours for admin vs agent vs finance
6. **Completion Rewards**: Celebrate milestones with achievements
7. **Help Chat**: Add live chat support during onboarding

## Troubleshooting

### Tour not appearing
- Check if `propflow-tour-seen` is in localStorage (if it is, clear it)
- Verify navigation links have correct href attributes
- Check browser console for JavaScript errors

### Checklist not updating
- Ensure localStorage is enabled
- Check that task completion localStorage keys are being set
- Verify dashboard component is properly imported

### Arrow positioning off
- Adjust `gap` variable in `getTooltipPosition()` function
- Check if element is visible and positioned correctly
- Test with different screen sizes and zoom levels

## Best Practices

1. **Keep tours short**: Users should complete tour in < 2 minutes
2. **Update on feature changes**: When adding new features, update tour
3. **A/B test**: Try different tour variations and measure completion
4. **Mobile responsive**: Test tour on mobile devices
5. **Accessibility**: Ensure keyboard navigation and screen reader support
6. **Analytics**: Track which steps users complete
7. **Feedback**: Add "Was this helpful?" at end of tour

## Files Modified

- `src/components/onboarding/FeatureTour.tsx` - New
- `src/components/onboarding/OnboardingChecklist.tsx` - New
- `src/components/layout/AppLayout.tsx` - Added FeatureTour import
- `src/pages/dashboard/DashboardPage.tsx` - Added OnboardingChecklist import

## Next Steps

1. Test the onboarding flow on different browsers
2. Gather user feedback on tour content
3. Consider adding video tutorials
4. Implement backend tracking for better analytics
5. Add role-based onboarding tours
6. Create admin panel to customize tour content
