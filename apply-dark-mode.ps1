# PowerShell script to apply dark mode classes to index.ejs
# This script adds dark mode Tailwind classes throughout the file

$file = "views\index.ejs"
$content = Get-Content $file -Raw

# Patterns and replacements for dark mode
$replacements = @{
    # Cards and containers
    'class="bg-white border border-gray-200 rounded-lg' = 'class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg'
    
    # Text colors
    'class="text-gray-700' = 'class="text-gray-700 dark:text-gray-200'
    'class="text-gray-600' = 'class="text-gray-600 dark:text-gray-300'
    'class="text-gray-800' = 'class="text-gray-800 dark:text-gray-100'
    'class="text-gray-500' = 'class="text-gray-500 dark:text-gray-400'
    
    # Backgrounds
    'class="bg-gray-100' = 'class="bg-gray-100 dark:bg-gray-700'
    'class="hover:bg-gray-200' = 'class="hover:bg-gray-200 dark:hover:bg-gray-600'
    
    # Form elements
    'border-gray-300 rounded-lg px' = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px'
    
    # Icon backgrounds
    'bg-indigo-100 rounded' = 'bg-indigo-100 dark:bg-indigo-900 rounded'
    'bg-emerald-100 rounded' = 'bg-emerald-100 dark:bg-emerald-900 rounded'
    'bg-sky-100 rounded' = 'bg-sky-100 dark:bg-sky-900 rounded'
    'bg-violet-100 rounded' = 'bg-violet-100 dark:bg-violet-900 rounded'
    
    # Icon colors
    'text-indigo-600"' = 'text-indigo-600 dark:text-indigo-400"'
    'text-emerald-600"' = 'text-emerald-600 dark:text-emerald-400"'
    'text-sky-600"' = 'text-sky-600 dark:text-sky-400"'
    'text-violet-600"' = 'text-violet-600 dark:text-violet-400"'
}

foreach ($pattern in $replacements.Keys) {
    $replacement = $replacements[$pattern]
    $content = $content -replace [regex]::Escape($pattern), $replacement
}

# Write the modified content back
$content | Set-Content $file -NoNewline

Write-Host "Dark mode classes applied successfully!" -ForegroundColor Green
