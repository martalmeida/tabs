# class for creating animations.

import os
import json
from functools import partial

import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import netCDF4 as netCDF
import numpy as np
from shapely.geometry import Polygon, MultiPolygon

from octant_lite import rot2d, shrink

# Data Files
HINDCAST_DATA_URI = 'http://barataria.tamu.edu:8080/thredds/dodsC/NcML/txla_nesting6.nc'  # noqa
FORECAST_DATA_URI = 'http://barataria.tamu.edu:8080/thredds/dodsC/oof_latest/roms_his_f_latest.nc'  # noqa
HERE = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(os.path.dirname(HERE), 'tabs', 'static', 'data')
_, filename = os.path.split(HINDCAST_DATA_URI)
HINDCAST_CACHE_DATA_URI = os.path.join(DATA_DIR, filename)
_, filename = os.path.split(FORECAST_DATA_URI)
FORECAST_CACHE_DATA_URI = os.path.join(DATA_DIR, filename)


class THREDDSFrameSource(object):

    def __init__(self, data_uri, decimate_factor=10,
                 grdfile=None):
        self.data_uri = data_uri
        self.decimate_factor = decimate_factor

        self.ncfile = data_uri
        self.nc = netCDF.Dataset(data_uri)

        if grdfile is None:
            self.ncg = self.nc
        else:
            self.ncg = netCDF.Dataset(grdfile)

        self.epochSeconds = self.nc.variables['ocean_time'][:].astype(int)
        self.dates = netCDF.num2date(self.epochSeconds,
                                     'seconds since 1970-01-01')

        self._configure_velocity_grid()
        self._configure_salt_grid()

    def _configure_velocity_grid(self):

        maskv = self.ncg.variables['mask_psi'][:]
        lon = self.ncg.variables['lon_psi'][:]
        lat = self.ncg.variables['lat_psi'][:]

        # What is happening here? Why is this necessary?
        self.velocity_angle = shrink(self.ncg.variables['angle'][:], lon.shape)

        idx, idy = np.where(maskv == 1.0)

        idv = np.arange(len(idx))
        # FIXME: This is a problem when open a connection and load some data,
        # then wait for a while and try to load some new data. This class gets
        # reinstatiated and the shuffled indices don't match. The output data
        # is thusly scrambled.
        np.random.shuffle(idv)

        Nvec = len(idx) / self.decimate_factor
        idv = idv[:Nvec]
        self.velocity_idx = idx[idv]
        self.velocity_idy = idy[idv]

        # save the grid locations as JSON file
        self.velocity_grid = {
            'lon': lon[self.velocity_idx, self.velocity_idy],
            'lat': lat[self.velocity_idx, self.velocity_idy]}

    def _configure_salt_grid(self):
        self.salt_lon = self.nc.variables['lon_rho'][:]
        self.salt_lat = self.nc.variables['lat_rho'][:]

        # FIXME: What about this mask thing?
        # self.salt_mask = self.nc.variables['mask_rho'][:]

        # # We don't need to decimate or shuffle this because we're going to be
        # # shipping out derived contour lines
        # self.salt_idx, self.salt_idy = mask.nonzero()

    def velocity_frame(self, frame_number):
        u = self.nc.variables['u'][frame_number, -1, :, :]
        v = self.nc.variables['v'][frame_number, -1, :, :]
        u, v = shrink(u, v)
        u, v = rot2d(u, v, self.velocity_angle)

        vector = {'date': self.dates[frame_number].isoformat(),
                  'u': u[self.velocity_idx, self.velocity_idy],
                  'v': v[self.velocity_idx, self.velocity_idy]}
        return vector

    def salt_frame(self, frame_number, num_levels=10, logspace=True,
                   cmap=None):
        salt = self.nc.variables['salt'][frame_number, 0, :, :]
        salt_range = (salt.max() - salt.min()) * 0.05

        if logspace:
            levels = np.logspace(
                np.log(salt.min() - salt_range),
                np.log(salt.max() + salt_range),
                num_levels, True, np.exp(1))
        else:
            levels = np.linspace(
                (salt.min() - salt_range),
                (salt.max() + salt_range),
                num_levels)

        plt.figure()
        if cmap is None:
            try:
                from cmocean.cm import salinity
                cmap = salinity
            except ImportError:
                cmap = 'YlGnBu'
        else:
            cmap = plt.cm.get_cmap(cmap)
        contours = plt.contourf(self.salt_lon, self.salt_lat, salt, levels,
                                cmap=cmap, extend='both')
        geojson = self.contours_to_geoJSON(contours)
        plt.close()

        frame = {'date': self.dates[frame_number].isoformat(),
                 'contours': geojson}

        return frame

    def contours_to_geoJSON(self, contours):
        features = []
        for collection, cvalue in zip(contours.collections, contours.cvalues):
            line_strings = []
            for path in collection.get_paths():
                path.should_simplify = False
                for coords in path.to_polygons():
                    line_strings.append(Polygon(coords))

            # Some multipolygons are empty, which breaks everything
            if not line_strings:
                continue

            mls = MultiPolygon(line_strings)

            # Numpy types apparently don't serialize to json
            rgba = contours.to_rgba(cvalue, bytes=True)
            opacity = int(rgba[-1]) / 255.0
            rgb = (rgba[0] << 16) + (rgba[1] << 8) + rgba[2]
            hex_color = "#{:06x}".format(rgb)
            feat = {'type': 'Feature',
                    'properties': {'fillColor': hex_color,
                                   'fillOpacity': opacity,
                                   'cvalue': cvalue},
                    'geometry': mls.__geo_interface__}

            features.append(feat)

        geojson = {'type': 'FeatureCollection', 'features': features}
        return geojson

    def __del__(self):
        """docstring for __del__"""
        self.nc.close()
        self.ncg.close()


def write_vector(vector, outfile):
    """ Save vector data for a timestep as JSON """
    out_dir = os.path.dirname(outfile)
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

    vector = vector.copy()
    for k in vector:
        if isinstance(vector[k], np.ndarray):
            vector[k] = vector[k].round(4).tolist()
    with open(outfile, 'w') as f:
        json.dump(vector, f)
        f.write('\n')

    print(" ... wrote {}".format(outfile))


# length of animation (number of frames)
def main(NFRAMES=90, output_dir=None):
    np.random.seed(0xDEADBEEF)
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__),
                                  '../static/data/json')
    filename = partial(os.path.join, output_dir)
    frame_source = THREDDSFrameSource(HINDCAST_CACHE_DATA_URI, decimate_factor=10)
    write_vector(frame_source.velocity_grid, filename('grd_locations.json'))

    for tidx in range(NFRAMES):
        vector = frame_source.velocity_frame(tidx)
        write_vector(vector, filename('step{}.json'.format(tidx)))


if __name__ == '__main__':
    main()
