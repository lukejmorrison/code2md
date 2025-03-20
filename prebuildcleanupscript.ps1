# This script must be run in PowerShell. Ensure your VS Code terminal is set to PowerShell.

# Verify we're running in PowerShell
if ($PSVersionTable.PSEdition -eq $null) {
    Write-Host "Error: This script must be run in PowerShell, not another shell like cmd.exe."
    exit 1
}

# Get current date and time for the checklist file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$checklistFile = "${timestamp}_BUILDCHECKLIST.md"
$fullPath = Join-Path -Path (Get-Location) -ChildPath $checklistFile

# Check if package.json exists
if (-Not (Test-Path -Path "package.json")) {
    Write-Host "Error: package.json not found in the current directory ($(Get-Location))!"
    exit 1
}

# Read and parse package.json
$packageJsonContent = Get-Content "package.json" -Raw | ConvertFrom-Json

# Extract relevant information
$projectName = $packageJsonContent.name
$projectVersion = $packageJsonContent.version
$projectDescription = $packageJsonContent.description
$projectAuthor = $packageJsonContent.author.name
$projectLicense = $packageJsonContent.license
$projectRepository = $packageJsonContent.repository.url

# Suggest next release version (increment patch version)
$versionParts = $projectVersion -split '\.'
$major = $versionParts[0]
$minor = $versionParts[1]
$patch = [int]$versionParts[2] + 1
$nextVersion = "$major.$minor.$patch"

# Determine package manager
if (Test-Path -Path "yarn.lock") {
    $PACKAGE_MANAGER = "yarn"
} elseif (Test-Path -Path "package-lock.json") {
    $PACKAGE_MANAGER = "npm"
} else {
    Write-Host "No lock file found. Using npm by default."
    $PACKAGE_MANAGER = "npm"
}

# Check if yarn is installed if needed
if ($PACKAGE_MANAGER -eq "yarn") {
    if (-Not (Get-Command yarn -ErrorAction SilentlyContinue)) {
        Write-Host "Yarn is not installed. Falling back to npm."
        $PACKAGE_MANAGER = "npm"
    }
}

# Delete node_modules
if (Test-Path -Path "node_modules") {
    Write-Host "Deleting node_modules..."
    Remove-Item -Recurse -Force "node_modules"
} else {
    Write-Host "node_modules not found. Skipping deletion."
}

# Reinstall dependencies
if ($PACKAGE_MANAGER -eq "yarn") {
    Write-Host "Reinstalling dependencies with yarn..."
    yarn install
} else {
    Write-Host "Reinstalling dependencies with npm..."
    npm install
}

# Generate the checklist content with project summary
$checklistContent = @"
# Build Checklist - $($timestamp)

## Project Summary
- **Name**: $($projectName)
- **Current Version**: $($projectVersion)
- **Description**: $($projectDescription)
- **Author**: $($projectAuthor)
- **License**: $($projectLicense)
- **Repository**: $($projectRepository)
- **Suggested Next Release Version**: $($nextVersion)

## Automated Steps Completed
- Verified `package.json` exists and is valid JSON.
- Determined package manager: $($PACKAGE_MANAGER)
- Deleted `node_modules` folder.
- Reinstalled dependencies using $($PACKAGE_MANAGER).

## Manual Steps to Consider Before Pushing to GitHub
- **Review Changes**: Ensure all changes are reviewed and tested.
- **Update Version**: If necessary, update the version in `package.json` to $($nextVersion).
- **Commit Changes**: Commit all changes with a meaningful message.
- **Run Tests**: Execute any tests to verify the build.
- **Check Dependencies**: Ensure all dependencies are up to date.
- **Push to GitHub**: Push the changes to the GitHub repository.

**Note**: This checklist is generated automatically. Review and complete the manual steps as needed.
"@

Write-Host "Creating checklist file at: $fullPath"

# Save the checklist to a file
$checklistContent | Out-File -FilePath $fullPath -Encoding UTF8

Write-Host "Cleanup and reinstallation complete. Checklist generated at: $fullPath"