#!/usr/bin/env node
// Adds RepCounter native files to the Xcode project.
// Run once after creating the Swift/ObjC files:
//   node scripts/addRepCounterFiles.js

const path = require('path')
const fs = require('fs')
const xcode = require('xcode')

const PROJECT_PATH = path.join(__dirname, '..', 'ios', 'Unlockd.xcodeproj', 'project.pbxproj')

const project = xcode.project(PROJECT_PATH)
project.parseSync()

// Find the Unlockd group UUID
function findGroupUuid(name) {
  const groups = project.hash.project.objects['PBXGroup'] || {}
  for (const [key, group] of Object.entries(groups)) {
    if (key.endsWith('_comment')) continue
    if (group.name === name || group.path === name) return key
  }
  return null
}

// Find the main target UUID
function findTargetUuid(name) {
  const targets = project.hash.project.objects['PBXNativeTarget'] || {}
  for (const [key, target] of Object.entries(targets)) {
    if (key.endsWith('_comment')) continue
    if (target.name === name) return key
  }
  return null
}

// Check if a file already exists in PBXFileReference section
function isAlreadyAdded(filename) {
  const refs = project.hash.project.objects['PBXFileReference'] || {}
  return Object.values(refs).some(ref =>
    ref && typeof ref === 'object' && ref.path && ref.path.includes(filename)
  )
}

// Generate a UUID for new items
function uuid() {
  return require('crypto').randomBytes(12).toString('hex').toUpperCase()
}

const groupUuid = findGroupUuid('Unlockd')
const targetUuid = findTargetUuid('Unlockd')

if (!groupUuid) { console.error('Could not find Unlockd group'); process.exit(1) }
if (!targetUuid) { console.error('Could not find Unlockd target'); process.exit(1) }

console.log(`Group UUID:  ${groupUuid}`)
console.log(`Target UUID: ${targetUuid}`)

const FILES = [
  { name: 'RepCounterView.swift',        type: 'sourcecode.swift'  },
  { name: 'RepCounterViewManager.swift', type: 'sourcecode.swift'  },
  { name: 'RepCounterModule.swift',      type: 'sourcecode.swift'  },
  { name: 'RepCounterBridge.m',          type: 'sourcecode.c.objc' },
]

let added = 0
FILES.forEach(({ name, type }) => {
  if (isAlreadyAdded(name)) {
    console.log(`  skip  ${name}`)
    return
  }

  const fileRefUuid   = uuid()
  const buildFileUuid = uuid()

  // 1. Add PBXFileReference
  const refs = project.hash.project.objects['PBXFileReference']
  refs[fileRefUuid] = {
    isa: 'PBXFileReference',
    lastKnownFileType: type,
    path: `"${name}"`,
    sourceTree: '"<group>"',
  }
  refs[`${fileRefUuid}_comment`] = name

  // 2. Add to Unlockd group's children
  const group = project.hash.project.objects['PBXGroup'][groupUuid]
  group.children.push({ value: fileRefUuid, comment: name })

  // 3. Add PBXBuildFile
  const buildFiles = project.hash.project.objects['PBXBuildFile']
  buildFiles[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: fileRefUuid,
  }
  buildFiles[`${buildFileUuid}_comment`] = `${name} in Sources`

  // 4. Add to Sources build phase of the target
  const target = project.hash.project.objects['PBXNativeTarget'][targetUuid]
  for (const phaseRef of target.buildPhases) {
    const phase = project.hash.project.objects['PBXSourcesBuildPhase']?.[phaseRef.value]
    if (phase) {
      phase.files.push({ value: buildFileUuid, comment: `${name} in Sources` })
      break
    }
  }

  console.log(`  add   ${name}`)
  added++
})

fs.writeFileSync(PROJECT_PATH, project.writeSync())
console.log(`\nDone — ${added} file(s) added to Unlockd.xcodeproj`)
