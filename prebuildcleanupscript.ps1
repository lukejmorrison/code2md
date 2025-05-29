# This script must be run in PowerShell. Ensure your VS Code terminal is set to PowerShell.

# Verify we're running in PowerShell
if ($null -eq $PSVersionTable.PSEdition) {
    Write-Host "Error: This script must be run in PowerShell, not another shell like cmd.exe."
    exit 1
}

# Create backup folder if it doesn't exist
$backupFolder = "backup"
if (-Not (Test-Path -Path $backupFolder)) {
    Write-Host "Creating backup folder..."
    New-Item -ItemType Directory -Path $backupFolder | Out-Null
}

# Initialize array to track moved files
$movedFiles = @()

# Move temporary files to backup folder
$tempFileExtensions = @("*.md", "*.log", "*.tmp", "*.temp")
foreach ($ext in $tempFileExtensions) {
    Get-ChildItem -Path "." -Filter $ext -File | ForEach-Object {
        if ($_.Directory.Name -ne "backup" -and $_.Directory.Name -ne "codereview") {
            $destination = Join-Path -Path $backupFolder -ChildPath $_.Name
            if (Test-Path -Path $destination) {
                $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                $destination = Join-Path -Path $backupFolder -ChildPath "$($_.BaseName)_$timestamp$($_.Extension)"
            }
            Move-Item -Path $_.FullName -Destination $destination
            $movedFiles += "$($_.Name) -> $destination"
        }
    }
}

# Get current date and time for the checklist file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$checklistFile = "${timestamp}_BUILDCHECKLIST.md"
$fullPath = Join-Path -Path (Get-Location) -ChildPath $checklistFile

# Read package.json and handle any errors
try {
    if (-Not (Test-Path -Path "package.json")) {
        throw "package.json not found in current directory"
    }
    
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    Write-Host "Reading package.json..."
    
    $projectName = if ($packageJson.name) { $packageJson.name } else { "Unknown" }
    $projectVersion = if ($packageJson.version) { $packageJson.version } else { "0.0.0" }
    $projectDescription = if ($packageJson.description) { $packageJson.description } else { "No description available" }
    $projectAuthor = if ($packageJson.author.name) { $packageJson.author.name } else { "Unknown" }
    $projectLicense = if ($packageJson.license) { $packageJson.license } else { "Unknown" }
    $projectRepository = if ($packageJson.repository.url) { $packageJson.repository.url } else { "Unknown" }

    # Calculate next version
    $versionParts = $projectVersion.Split('.')
    $nextVersion = "$($versionParts[0]).$($versionParts[1]).$([int]$versionParts[2] + 1)"

    Write-Host "Project information loaded successfully"
    Write-Host "Current version: $projectVersion"
    Write-Host "Next suggested version: $nextVersion"
} catch {
    Write-Host "Error processing package.json: $_"
    Write-Host "Using default values..."
    
    $projectName = "Unknown"
    $projectVersion = "0.0.0"
    $projectDescription = "No description available"
    $projectAuthor = "Unknown"
    $projectLicense = "Unknown"
    $projectRepository = "Unknown"
    $nextVersion = "0.0.1"
}

# Determine package manager
$PACKAGE_MANAGER = if (Test-Path "yarn.lock") { "yarn" } else { "npm" }

# Check if backup and codereview are tracked and remove them from GitHub if they are
$foldersToUntrack = @("backup", "codereview")
$untrackedFolders = @()
foreach ($folder in $foldersToUntrack) {
    if (git ls-files $folder --error-unmatch 2>$null) {
        Write-Host "Folder '$folder' is tracked. Removing it from Git tracking..."
        git rm --cached -r $folder
        $untrackedFolders += $folder
    } else {
        Write-Host "Folder '$folder' is not tracked in Git. No action needed."
    }
}

# If any folders were untracked, stage and commit the changes
if ($untrackedFolders.Count -gt 0) {
    Write-Host "Staging changes to remove tracked folders from Git..."
    git add .gitignore
    git commit -m "Remove $(( $untrackedFolders -join ', ')) from Git tracking as they are now in .gitignore"
    Write-Host "Changes committed locally. You need to push to GitHub to update the remote repository."
} else {
    Write-Host "No changes needed for Git tracking."
}

# Generate the checklist content
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

## Cleanup Summary
### Backup Operations
$(if ($movedFiles.Count -gt 0) {
    $movedFiles | ForEach-Object { "- Moved: $_" } | Out-String
} else {
    "- No files needed to be moved to backup"
})

### GitHub Repository Cleanup
$(if ($untrackedFolders.Count -gt 0) {
    "- Removed the following folders from Git tracking (will be reflected on GitHub after push): $($untrackedFolders -join ', ')"
} else {
    "- No folders needed to be removed from Git tracking"
})

## Automated Steps Completed
- Created/Verified backup folder exists
- Moved temporary files to backup folder
- Verified `package.json` exists and is valid JSON
- Determined package manager: $($PACKAGE_MANAGER)
- Deleted `node_modules` folder
- Reinstalled dependencies using $($PACKAGE_MANAGER)
- Checked and removed `backup` and `codereview` from Git tracking if previously committed

## Manual Steps to Consider Before Pushing to GitHub
- **Review Changes**: Ensure all changes are reviewed and tested
- **Update Version**: If necessary, update the version in `package.json` to $($nextVersion)
- **Push to GitHub**: Run `git push` to update the GitHub repository with the removal of tracked folders
- **Run Tests**: Execute any tests to verify the build
- **Check Dependencies**: Ensure all dependencies are up to date

**Note**: This checklist is generated automatically. Review and complete the manual steps as needed.
"@

# Create the checklist file
Write-Host "Creating checklist file..."
$checklistContent | Out-File -FilePath $fullPath -Encoding UTF8

# Move the checklist file to backup folder
$backupPath = Join-Path -Path $backupFolder -ChildPath $checklistFile
Move-Item -Path $fullPath -Destination $backupPath

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

# Provide feedback
Write-Host "Cleanup and reinstallation complete. Checklist generated at: $backupPath"
Write-Host "Moved $($movedFiles.Count) files to backup folder"
if ($untrackedFolders.Count -gt 0) {
    Write-Host "Please run 'git push' to update GitHub with the removal of: $($untrackedFolders -join ', ')"
}