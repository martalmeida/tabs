#!/usr/bin/env python
# -*- coding: utf-8 -*-

from contextlib import contextmanager
import glob
import os
import shutil
import subprocess
import tempfile

import numpy as np

from ..thredds_frame_source import main


np.random.seed(0xDEADBEEF)

file_glob = os.path.join(os.path.dirname(__file__),
                         'reference_data/ref_*.json')
TEST_FILES = glob.glob(file_glob)
NFRAMES = len([f for f in TEST_FILES if 'step' in f])
NFRAMES = 6


def diff_file(f_ref, f):
    try:
        subprocess.check_output(['diff', '-y', f_ref, f])
    except subprocess.CalledProcessError as e:
        raise AssertionError("{}\n\nFiles differ: {!r} {!r}".format(e.output,
                                                                    f_ref, f))


def test_files():
    with tempdir() as output_dir:
        main(NFRAMES=NFRAMES, output_dir=output_dir)
        for f_ref in TEST_FILES:
            f = os.path.basename(f_ref).replace('ref_', '')
            f = os.path.join(output_dir, f)
            yield diff_file, f_ref, f


@contextmanager
def tempdir():
    output_dir = tempfile.mkdtemp()
    yield output_dir
    shutil.rmtree(output_dir)
