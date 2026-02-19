/**
 * electron-builder afterPack hook.
 *
 * Strips extended attributes (quarantine, metadata forks, etc.) from the app bundle
 * before it is packaged into a DMG. Without this step, npm-downloaded native binaries
 * (.node, .dylib) carry macOS quarantine attributes that cause Finder error -36
 * ("cannot read or write some data") when the user drags the app to Applications.
 */
const { execSync } = require('child_process')
const path = require('path')

module.exports = async (context) => {
  if (process.platform !== 'darwin') return

  const { appOutDir, packager } = context
  const appPath = path.join(appOutDir, `${packager.appInfo.productFilename}.app`)

  try {
    execSync(`xattr -cr "${appPath}"`, { stdio: 'pipe' })
    console.log(`  • Stripped extended attributes from ${packager.appInfo.productFilename}.app`)
  } catch (err) {
    console.warn('  ⚠ Could not strip extended attributes:', err.message)
  }
}
