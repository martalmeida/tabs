# class for creating animations.

import matplotlib
matplotlib.use('Agg')

import os
import json

import numpy as np
np.random.seed(0xDEADBEEF)

import matplotlib.pyplot as plt
from mpl_toolkits.basemap import Basemap
import netCDF4 as netCDF

from octant_lite import rot2d, shrink

# length of animation (number of frames)
NFRAMES = 90

# set output precision for JSON data
json.encoder.FLOAT_REPR = lambda o: format(o, '.4f')


class mch_animation(object):
    """docstring for MCH animation"""

    figsize = (8, 6)

    font_fixed = plt.matplotlib.font_manager.FontProperties()
    font_fixed.set_family('monospace')

    font_label_it = plt.matplotlib.font_manager.FontProperties()
    font_label_it.set_size(8)
    font_label_it.set_slant('oblique')

    font_label = plt.matplotlib.font_manager.FontProperties()
    font_label.set_size(8)

    def __init__(self, ncfile, framedir, grdfile=None):
        self.ncfile = ncfile
        self.nc = netCDF.Dataset(ncfile)
        self.framedir = framedir

        if grdfile is None:
            self.ncg = self.nc
        else:
            self.ncg = netCDF.Dataset(grdfile)

        self.dates = netCDF.num2date(self.nc.variables['ocean_time'][:],
                                    'seconds since 1970-01-01')
        self.basemap = Basemap(llcrnrlon=-95.1,
                                llcrnrlat=27.25,
                                urcrnrlon=-87.5,
                                urcrnrlat=30.95,
                                projection='lcc',
                                lat_0=30.0,
                                lon_0=-90.0,
                                resolution ='i',
                                area_thresh=0.)

        os.system('mkdir %s' % self.framedir)
        self.frame = 0

    def new_frame(self, n):
        """docstring for new_frame"""
        self.n = n

        # set up figure and axis
        self.fig = plt.figure(figsize=self.figsize)
        self.ax = self.fig.add_axes([-0.01, 0.27, 1.01, 0.73])

        self.basemap.drawcoastlines(linewidth=0.25, color='k')
        self.basemap.fillcontinents(color='0.7')
        self.basemap.drawmeridians(range(-97, -85, 1), labels=[0, 0, 0, 0],
                                  color='0.5', linewidth=0.25)
        self.basemap.drawparallels(range(25, 32, 1), labels=[0, 0, 0, 0],
                                  color='0.5', linewidth=0.25)

        # get and plot date
        #datestr = str(n)
        datestr = self.dates[self.n].strftime('%Y %b %d %H:%M GMT')
        plt.text(0.02, 0.24, datestr+' ',
                fontproperties=self.font_fixed,
                horizontalalignment='left',
                verticalalignment='top',
                transform=self.fig.transFigure,
                fontsize=12)

    def close_frame(self):

        self.ax.set_axis_off()
        plt.savefig('%s/frame_%04d.png' % (self.framedir, self.frame), dpi=100)
        print ' ... wrote frame ', self.frame
        self.frame += 1
        plt.close(self.fig)

    def plot_vector_surface(self):
        decimate_factor = 60

        if self.frame == 0:
            lon = self.ncg.variables['lon_psi'][:]
            lat = self.ncg.variables['lat_psi'][:]
            xv, yv = self.basemap(lon, lat)
            self.xv, self.yv = xv, yv
            maskv = self.ncg.variables['mask_psi'][:]
            self.anglev = shrink(self.ncg.variables['angle'][:], xv.shape)
            idx, idy = np.where(maskv == 1.0)
            idv = np.arange(len(idx))
            np.random.shuffle(idv)
            Nvec = len(idx) / decimate_factor
            idv = idv[:Nvec]
            self.idx = idx[idv]
            self.idy = idy[idv]
            # save the grid locations as JSON file
            out_grdfile = 'grd_locations.json'
            grd = {'lon': lon[self.idx, self.idy].tolist(),
                   'lat': lat[self.idx, self.idy].tolist()}
            write_vector(grd, out_grdfile)
 
        u = self.nc.variables['u'][self.n, -1, :, :]
        v = self.nc.variables['v'][self.n, -1, :, :]
        u, v = shrink(u, v)
        u, v = rot2d(u, v, self.anglev)

        self.q = self.ax.quiver(self.xv[self.idx, self.idy],
        self.yv[self.idx, self.idy],
                                u[self.idx, self.idy],
                                v[self.idx, self.idy],
                                scale=20.0, pivot='middle',
                                zorder=1e35, alpha=0.25,
                                width=0.003)

        self.ax.quiverkey(self.q, 0.8, 0.90,
                          0.5, r'0.5 m s$^{-1}$', zorder=1e35)
        self.basemap.set_axes_limits(ax=self.ax)

        datestr = self.dates[self.n].strftime('%Y %b %d %H:%M GMT')
        vector = {'date': self.dates[self.n].isoformat(),
                  'u': u[self.idx, self.idy].tolist(),
                  'v': v[self.idx, self.idy].tolist()}
        return vector

    def __del__(self):
        """docstring for __del__"""
        self.nc.close()
        self.ncg.close()


def write_vector(vector, outfile):
    """ Save vector data for a timestep as JSON """
    out_dir = os.path.join(os.path.dirname(__file__), 'json_data')
    if not os.path.exists(out_dir):
        os.mkdir(out_dir)
    filename = os.path.join(out_dir, outfile)
    with open(filename, 'w') as f:
        json.dump(vector, f)


if __name__ == '__main__':

    data_file = 'http://barataria.tamu.edu:8080/thredds/dodsC/NcML/txla_nesting6.nc'
    dir_name = 'vector_frames'
    mch = mch_animation(data_file, dir_name)

    for tidx in xrange(NFRAMES):
        print tidx
        mch.new_frame(tidx)
        vector = mch.plot_vector_surface()
        write_vector(vector, 'step{}.json'.format(mch.n))
        mch.close_frame()
