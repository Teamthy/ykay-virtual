// Package bankdata embeds the shared CBT question bank CSV so any deployment
// (docker scratch, Render, dev) can seed the bank with one env flag — the
// binary always ships with the questions. Same file seeds the college site
// (prisma/cbt-bank.csv there); regenerate all copies from cbt-bank/build.py.
package bankdata

import _ "embed"

//go:embed bank.csv
var csv string

// CSV returns the embedded bank in the shared CSV layout:
// subjectSlug,subjectName,classLevel,department,topic,difficulty,stem,
// optionA..D,correctIndex,explanation,source
func CSV() string { return csv }
