#!/usr/bin/env python3
"""Export named OS Open Rivers watercourse links from a GeoPackage to a TSV
(id, name, name_alt, form, wkb_hex) for loading into PostGIS.

A GeoPackage is a SQLite DB, so we read it with the stdlib sqlite3 module (no GDAL).
Each geometry is stored as a GeoPackage Binary (GPB): a small header followed by the
plain WKB. We strip the header and emit the WKB (still EPSG:27700 — reprojected on load).
"""
import sqlite3
import sys


def gpb_to_wkb(blob):
    # GPB header = 'GP' + version + flags + 4-byte srs_id, then optional envelope
    # whose size is encoded in flag bits 1-3 (0/32/48/48/64 bytes).
    env = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[(blob[3] >> 1) & 7]
    return blob[8 + env:]


def clean(s):
    return (s or "").replace("\\", " ").replace("\t", " ").replace("\n", " ")


def main(gpkg_path, out_path):
    con = sqlite3.connect(gpkg_path)
    n = 0
    with open(out_path, "w") as out:
        for r in con.execute(
            "SELECT id, watercourse_name, watercourse_name_alternative, form, geometry "
            "FROM watercourse_link WHERE watercourse_name IS NOT NULL"
        ):
            out.write(
                f"{clean(r[0])}\t{clean(r[1])}\t{clean(r[2])}\t{clean(r[3])}\t{gpb_to_wkb(r[4]).hex()}\n"
            )
            n += 1
    print(f"exported {n} named links", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
