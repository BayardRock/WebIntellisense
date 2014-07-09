// --------------------------------------------------------------------------------------
// FAKE build script
// --------------------------------------------------------------------------------------

#r "System.ServiceProcess.dll"
#r "packages/FAKE/tools/FakeLib.dll"
#r "packages/FAKE/tools/Fake.Deploy.Lib.dll"
open Fake
open Fake.Git
open Fake.AssemblyInfoFile
open Fake.ReleaseNotesHelper
open System
open System.IO
open System.Diagnostics

let project = "WebInstellisense"
let summary = "Bayard Rock's WebIntellisense"
let description = "Bayard Rock's WebIntellisense."
let authors = [ "Peter Rosconi" ]
let tags = "BayardRock Intellisense JavaScript"
let gitHome = "http://github.com/BayardRock/"
let gitName = "WebIntellisense"

// Read additional information from the release notes document
Environment.CurrentDirectory <- __SOURCE_DIRECTORY__
let release = parseReleaseNotes (File.ReadAllLines "RELEASE_NOTES.md")

//  ____        _ _     _ 
// |  _ \      (_) |   | |
// | |_) |_   _ _| | __| |
// |  _ <| | | | | |/ _` |
// | |_) | |_| | | | (_| |
// |____/ \__,_|_|_|\__,_|

let createDir(dir) = if not <| Directory.Exists(dir) then Directory.CreateDirectory(dir) |> ignore

Target "Build" (fun _ ->

    let libDir = Path.Combine("bin", "content", "Scripts")
    let cssDir = Path.Combine("bin", "content", "Content")
    let toolsDir = Path.Combine("bin", "Tools")

    createDir(libDir)
    createDir(cssDir)
    createDir(toolsDir)

    let minify(file) = 
        let fileName = Path.GetFileName(file)
        let minFileName = Path.Combine(libDir, Path.ChangeExtension(fileName, ".min.js"))
        
        ExecProcess(fun info ->
            info.FileName <- "node"
            info.Arguments <- sprintf "packages/uglifyjs/bin/uglifyjs -o %s %s" minFileName file
        ) (TimeSpan.FromMinutes(5.0)) |> ignore

    // copy javascript files
    !! "src/js/lib/*.js" |> Seq.iter (minify)

    // copy css files
    File.Copy("src/css/webintellisense.css", Path.Combine(cssDir, "webintellisense.css"))

    // copy powershell files
    !! "nuget/*.ps1" |> Seq.iter (fun file ->
        let fileName = Path.GetFileName(file)
        let newFile = Path.Combine(toolsDir, fileName)
        File.Copy(file, newFile)
    )
)
                        
// --------------------------------------------------------------------------------------
// Clean build results 

Target "Clean" (fun _ ->
    CleanDirs ["bin"; "temp"]
)

Target "CleanDocs" (fun _ ->
    CleanDirs ["docs/output"]
)

// --------------------------------------------------------------------------------------
// Build a NuGet package

Target "NuGet" (fun _ ->
    // Format the description to fit on a single line (remove \r\n and double-spaces)
    let description = description.Replace("\r", "")
                                 .Replace("\n", "")
                                 .Replace("  ", " ")
    let nugetPath = ".nuget/nuget.exe"
    NuGet (fun p ->
        { p with
            Authors = authors
            Project = project
            Summary = summary
            Description = description
            Version = release.NugetVersion
            ReleaseNotes = String.Join(Environment.NewLine, release.Notes)
            Tags = tags
            OutputPath = "bin"
            ToolPath = nugetPath
            AccessKey = getBuildParamOrDefault "nugetkey" ""
            Publish = hasBuildParam "nugetkey"
            Dependencies = [] })
        ("nuget/webintellisense.nuspec")
)

Target "All" DoNothing

// dependencies
"Clean"
  ==> "Build"
  ==> "All"

"All"
  ==> "NuGet"
  ==> "CleanDocs"

RunTargetOrDefault "All"
