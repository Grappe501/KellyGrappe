Write-Host "Building Kelly Grappe SOS Campaign App Scaffold..."

# Root Paths
$root = Get-Location
$appPath = Join-Path $root "app"
$srcPath = Join-Path $appPath "src"
$modulesPath = Join-Path $srcPath "modules"
$sharedPath = Join-Path $srcPath "shared"
$netlifyPath = Join-Path $appPath "netlify"
$functionsPath = Join-Path $netlifyPath "functions"
$apiPath = Join-Path $functionsPath "api"
$actionsPath = Join-Path $apiPath "actions"
$validatorsPath = Join-Path $apiPath "validators"
$schemaPath = Join-Path $netlifyPath "schema\modules"
$docsPath = Join-Path $root "docs"
$moduleCopyPath = Join-Path $docsPath "MODULE_COPY"

# Create Directories
$dirs = @(
    $appPath,
    "$srcPath\app\router",
    "$srcPath\app\moduleRegistry",
    "$srcPath\app\layout",
    "$modulesPath\eventRequests",
    "$sharedPath\components",
    "$sharedPath\forms",
    "$sharedPath\validation",
    "$sharedPath\uiCopy",
    "$sharedPath\utils",
    "$srcPath\assets",
    "$appPath\public",
    $netlifyPath,
    $functionsPath,
    $apiPath,
    $actionsPath,
    $validatorsPath,
    $schemaPath,
    $docsPath,
    $moduleCopyPath
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

Write-Host "Folders created."

# Helper function to create file if missing
function Create-FileIfMissing {
    param ($path, $content)
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value $content
    }
}

# =============================
# ROOT FILES
# =============================

Create-FileIfMissing "$root\README.md" "# Kelly Grappe SOS Campaign App`n`nPhase 1 Scaffold"

Create-FileIfMissing "$root\netlify.toml" @"
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "app/netlify/functions"
"@

Create-FileIfMissing "$root\.gitignore" @"
node_modules
dist
.env
.netlify
"@

# =============================
# MODULE 001 - EVENT REQUEST
# =============================

Create-FileIfMissing "$modulesPath\eventRequests\module.json" @"
{
  "moduleId": "MODULE_001_EVENT_REQUEST",
  "route": "/event-request",
  "title": "Invite Kelly to Your Event",
  "description": "Submit an event request for Kelly to attend in your community.",
  "version": "1.0.0",
  "status": "active"
}
"@

Create-FileIfMissing "$modulesPath\eventRequests\EventRequestPage.jsx" @"
export default function EventRequestPage() {
  return <div>Event Request Module Stub</div>;
}
"@

Create-FileIfMissing "$schemaPath\eventRequests.schema.json" @"
{
  "type": "object",
  "properties": {}
}
"@

Create-FileIfMissing "$moduleCopyPath\MODULE_001_EVENT_REQUEST_COPY.md" "# Module 001 Copy Placeholder"

# =============================
# MODULE REGISTRY
# =============================

Create-FileIfMissing "$srcPath\app\moduleRegistry\index.js" @"
import eventModule from '../../modules/eventRequests/module.json';

export const moduleRegistry = [
  eventModule
];
"@

# =============================
# ROUTER
# =============================

Create-FileIfMissing "$srcPath\app\router\AppRouter.jsx" @"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EventRequestPage from '../../modules/eventRequests/EventRequestPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/event-request' element={<EventRequestPage />} />
      </Routes>
    </BrowserRouter>
  );
}
"@

# =============================
# LAYOUT
# =============================

Create-FileIfMissing "$srcPath\app\layout\MainLayout.jsx" @"
export default function MainLayout({ children }) {
  return <div>{children}</div>;
}
"@

# =============================
# SHARED COMPONENT STUBS
# =============================

Create-FileIfMissing "$sharedPath\components\FormWrapper.jsx" "export default function FormWrapper(){ return null }"
Create-FileIfMissing "$sharedPath\forms\DynamicForm.jsx" "export default function DynamicForm(){ return null }"
Create-FileIfMissing "$sharedPath\validation\validate.js" "export function validate(){ return true }"
Create-FileIfMissing "$sharedPath\utils\apiClient.js" "export async function submit(){ return true }"

# =============================
# NETLIFY UNIVERSAL SUBMIT FUNCTION
# =============================

Create-FileIfMissing "$apiPath\submit.js" @"
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Stub submission successful' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
"@

# =============================
# ACTION STUBS
# =============================

Create-FileIfMissing "$actionsPath\sendEmail.js" "module.exports = async () => { return true }"
Create-FileIfMissing "$actionsPath\createCalendarEvent.js" "module.exports = async () => { return true }"
Create-FileIfMissing "$actionsPath\logSubmission.js" "module.exports = async () => { return true }"

# =============================
# VALIDATOR STUB
# =============================

Create-FileIfMissing "$validatorsPath\validateAgainstSchema.js" @"
module.exports = function validateAgainstSchema(data, schema) {
  return { valid: true };
};
"@

Write-Host "Scaffold complete."
Write-Host "Next Steps:"
Write-Host "1. cd app"
Write-Host "2. npm create vite@latest . -- --template react"
Write-Host "3. npm install react-router-dom"
Write-Host "4. npm install"