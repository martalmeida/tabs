#!/usr/bin/env python
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from thredds_frame_source import THREDDSFrameSource, DEFAULT_DATA_URI

# origin = 'lower'
#origin = 'upper'

tfs = THREDDSFrameSource(data_uri=DEFAULT_DATA_URI)
X = tfs.salt_lon
Y = tfs.salt_lat

Z = tfs.nc.variables['salt'][0, 0, :, :]

plt.figure()

Z_range = (Z.max() - Z.min()) * 0.05
levels = np.logspace(
    np.log(Z.min() - Z_range),
    np.log(Z.max() + Z_range),
    100, True, np.exp(1))
CS3 = plt.contourf(X, Y, Z, levels, extend='both')

# Our data range extends outside the range of levels; make
# data below the lowest contour level yellow, and above the
# highest level cyan:
CS3.cmap.set_under('yellow')
CS3.cmap.set_over('cyan')

plt.colorbar(CS3)

plt.savefig('/scratch/tmp.png')
