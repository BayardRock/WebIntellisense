// --------------------------------------------------------------------------------------
// FAKE build script
// --------------------------------------------------------------------------------------

#r "System.ServiceProcess.dll"
#r "packages/FAKE/tools/FakeLib.dll"
#r "packages/FAKE/tools/Fake.Deploy.Lib.dll"
open Fake
open Fake.Git
open Fake.REST
open Fake.AssemblyInfoFile
open Fake.ReleaseNotesHelper
open System
open System.Collections.Specialized
open System.Diagnostics
open System.Net
open System.IO

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

    createDir(libDir)
    createDir(cssDir)

    let minify(file) = 

        let fileName = Path.GetFileName(file)
        let url = "http://closure-compiler.appspot.com/compile"
        let minFileName = Path.Combine(libDir, Path.ChangeExtension(fileName, ".min.js"))

        use wc = new WebClient()
        let data = new NameValueCollection()
        data.["js_code"] <- File.ReadAllText(file)
        data.["output_format"] <- "text"
        data.["output_info"] <- "compiled_code"
        let textBytes = wc.UploadValues(url, data)
        File.WriteAllBytes(minFileName, textBytes)

    // copy javascript files
    !! "src/js/lib/*.js" |> Seq.iter minify

    // copy css files
    File.Copy("src/css/webintellisense.css", Path.Combine(cssDir, "webintellisense.css"))
)

Target "Zip" (fun _ ->
    let notes = String.Join("\n", release.Notes)
    !! "bin/**/*.*" |> CreateZip "bin" "bin/release.zip" notes 0 true
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
            Publish = true
            Dependencies = [] })
        ("nuget/webintellisense.nuspec")
)

Target "All" DoNothing

// dependencies
"Clean"
  ==> "Build"
  ==> "Zip"
  ==> "All"

"All"
  ==> "NuGet"
  ==> "CleanDocs"

RunTargetOrDefault "All"
