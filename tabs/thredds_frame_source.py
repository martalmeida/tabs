# class for creating animations.

import os
import json
from functools import partial

import matplotlib
#matplotlib.use('Agg')

import matplotlib.pyplot as plt
import netCDF4 as netCDF
import numpy as np
from shapely.geometry import Polygon, MultiPolygon

from octant_lite import rot2d, shrink

# Data Files
#GRD='http://barataria.tamu.edu:8080/thredds/dodsC/txla_nesting6_grid/txla_grd_v4_new.nc'
#HINDCAST_DATA_URI = 'http://barataria.tamu.edu:8080/thredds/dodsC/NcML/txla_nesting6.nc'  # noqa
#FORECAST_DATA_URI = 'http://barataria.tamu.edu:8080/thredds/dodsC/oof_latest/roms_his_f_latest.nc'  # noqa

GRD='txla_grd_v4_new.nc4'
#HINDCAST_DATA_URI = 'http://barataria.tamu.edu:8080/thredds/dodsC/txla_oof_latest/txla_forecast_20140419.nc'
#FORECAST_DATA_URI = 'http://barataria.tamu.edu:8080/thredds/dodsC/txla_oof_latest/txla_forecast_20140905.nc'
HINDCAST_DATA_URI = 'txla_forecast_20140419_surface.nc'
FORECAST_DATA_URI = 'txla_forecast_20140905_surface.nc'
RADAR_DATA_URI    = 'radar.nc'
WIND_DATA_URI     = 'roms_blk_20140420_a_n0_wind.nc4'

HERE = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(os.path.dirname(HERE), 'tabs', 'static', 'data')
_, filename = os.path.split(HINDCAST_DATA_URI)
HINDCAST_CACHE_DATA_URI = os.path.join(DATA_DIR, filename)
_, filename = os.path.split(FORECAST_DATA_URI)
FORECAST_CACHE_DATA_URI = os.path.join(DATA_DIR, filename)

def gen_regular_uv_inds(mask,d0=3,d1=[2,3,4]):
  di=dj=d0
  m=np.zeros(mask.shape,bool)
  m[::di,::dj]=1
  m[mask==0]=0

  i0=np.where(m.flat==1)[0]

  inds={}
  inds[1]=range(i0.size)
  for D in d1:
    m[:]=False
    m[::di*D,::dj*D]=1
    m[mask==0]=0
    i1=np.where(m.flat==1)[0]
    I=[np.where(i0==j)[0][0] for j in i1]
    inds[D]=I

  return inds,i0

class THREDDSFrameSource(object):

    def __init__(self, data_uri, decimate_factor=10,
                 grdfile=GRD,uv_regular=True):

        self.uv_regular=uv_regular
        self.data_uri = data_uri
        self.isForec=data_uri==FORECAST_DATA_URI
        self.decimate_factor = decimate_factor

        self.ncfile = data_uri
        self.nc = netCDF.Dataset(data_uri)

        if grdfile is None:
            self.ncg = self.nc
        else:
            self.ncg = netCDF.Dataset(grdfile)

        self.epochSeconds = self.nc.variables['ocean_time'][:].astype(int)
        if self.isForec: self.epochSeconds = self.epochSeconds[-100:][::-1]
        self.dates = netCDF.num2date(self.epochSeconds, 'seconds since 1970-01-01')

        print 'loading velocity grid ...'
        self._configure_velocity_grid()
        print 'loading salt grid ...'
        self._configure_salt_grid()
        print 'loading bathy contours...'
        self.bathy=self.bathy_contours()
        print 'loading radar grid ...'
        #self._configure_radar_grid()
        self._init_radar()
        print 'loading wind grid ...'
        self. _configure_wind_grid()
        print 'loading buoys grid ...'
        self. _configure_buoys_grid()

        print 'all grids done !!'

    def _configure_velocity_grid(self):

        maskv = self.ncg.variables['mask_psi'][:]
        lon = self.ncg.variables['lon_psi'][:]
        lat = self.ncg.variables['lat_psi'][:]
        self.velocity_angle = shrink(self.ncg.variables['angle'][:], lon.shape)


        if self.uv_regular:
          inds,i0=gen_regular_uv_inds(mask=maskv)
          self.velocity_inds=inds
          self.velocity_i0=i0
          self.velocity_grid = dict(lon=lon.flat[i0],lat=lat.flat[i0])
        else:
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
          self.velocity_grid = {
            'lon': lon[self.velocity_idx, self.velocity_idy],
            'lat': lat[self.velocity_idx, self.velocity_idy]}

    def _configure_salt_grid(self):
        self.salt_lon = self.ncg.variables['lon_rho'][:]
        self.salt_lat = self.ncg.variables['lat_rho'][:]

        # FIXME: What about this mask thing?
        # self.salt_mask = self.nc.variables['mask_rho'][:]

        # # We don't need to decimate or shuffle this because we're going to be
        # # shipping out derived contour lines
        # self.salt_idx, self.salt_idy = mask.nonzero()	


    def _init_radar(self,):
        import radar
        grd_xy=self.salt_lon,self.salt_lat
        step=1
        ntimes_max=240
        self.radar=radar.TXLARadar(grd_xy,step,ntimes_max)

        inds,i0=gen_regular_uv_inds(mask=~self.radar.mask0,d0=1)
        self.radar_grid= dict(lon=self.radar.lon.flat[i0],lat=self.radar.lat.flat[i0])
        self.radar_inds=inds
        self.radar_i0=i0

    '''
    def _update_radar_grid(self,mask):
      # needed to update regular grid to new mask! Mask changes for each time step!
      # must be called each time when loading u,v
      inds,i0=gen_regular_uv_inds(mask=mask,d0=1)
      self.radar_inds=inds
      self.radar_i0=i0
      self.radar_grid = dict(lon=self.radar.lon.flat[i0],lat=self.radar.lat.flat[i0])
    '''

    '''
    def _configure_radar_grid(self):
        self.nc_radar=netCDF.Dataset(RADAR_DATA_URI)
        lon=self.nc_radar.variables['lon'][:]
        lat=self.nc_radar.variables['lat'][:]
        try:
          mask=self.nc_radar.variables['mask'][:]
        except: 
          mask=np.ones(lon.shape,'bool')


        # use regular radar grid, always:
        inds,i0=gen_regular_uv_inds(mask=mask,d0=1)
        self.radar_inds=inds
        self.radar_i0=i0
        self.radar_grid = dict(lon=lon.flat[i0],lat=lat.flat[i0])
    '''

    def _configure_wind_grid(self):
        self.wind_dij=12
        mask=np.ones(self.salt_lon.shape,'bool')

        # use regular radar grid, always:
        inds,i0=gen_regular_uv_inds(mask=mask,d0=self.wind_dij)
        self.wind_inds=inds
        self.wind_i0=i0
        self.wind_grid = dict(lon=self.salt_lon.flat[i0],lat=self.salt_lat.flat[i0])

    def _configure_buoys_grid(self):
        # read from source, or just set it for now:
        x=np.asarray([-92.99,-89.8,-94.23])
        y=np.asarray([28.74,28.73,27.77])
        names='boia 1','boia 2','boia 3'
        self.buoys_grid = dict(lon=x,lat=y,name=names)
        self.buoys_inds=np.arange(x.size)
        
    def velocity_frame(self, frame_number):
        if self.isForec: frame_number=-1-frame_number
        print 'loading vel  frame number %d, isforec=%d'%(frame_number,self.isForec)
        u = self.nc.variables['u'][frame_number, -1, :, :]
        v = self.nc.variables['v'][frame_number, -1, :, :]
        u, v = shrink(u, v)
        u, v = rot2d(u, v, self.velocity_angle)

        if self.uv_regular:
            vector = {'date': self.dates[frame_number].isoformat(),
                      'u':    (u.flat[self.velocity_i0]*100).astype('i'),
                      'v':    (v.flat[self.velocity_i0]*100).astype('i'),
                      'inds': self.velocity_inds}
        else:
            vector = {'date': self.dates[frame_number].isoformat(),
                  'u': u[self.velocity_idx, self.velocity_idy],
                  'v': v[self.velocity_idx, self.velocity_idy]}

        print 'loading velocity_frame done'

        return vector

    def radar_frame(self, tind):
        # current model date:
        date=self.dates[tind]

        import datetime
        date=datetime.datetime(2016,9,10)
        #date=datetime.datetime(2014,4,19)

        u,v,msg=self.radar.load_uv_at_date(date)
        if msg:
          print msg
          return {'date': date.isoformat(),'u': [],'v': []}

        # update grid cos of new mask:
        #self._update_radar_grid(~u.mask)
        u[u.mask]=0.5
        v[v.mask]=0.5
        vector = {'date': date.isoformat(),
                  'u':    (u.flat[self.radar_i0]*100).astype('i'),
                  'v':    (v.flat[self.radar_i0]*100).astype('i'),
                  'inds': self.radar_inds}

        return vector

        '''
        from dateutil import parser
        from netcdftime import utime
        import datetime

        # load radar times:
        tnum=self.nc_radar.variables['time'][:]
        tunits=self.nc_radar.variables['time'].units
        time=utime(tunits,calendar='standard').num2date(tnum)

        try:
          DtMax=time[-1]-time[-2]
        except: DtMax=datetime.timedelta(days=1./24)

        # current model date:
        date=self.dates[tind]

        # find nearest time in radar:
        d=np.abs(time-date)
        i=np.where(d==d.min())[0][0]

        # let the max diff be radar dt
        if time[i]>date: 
            dt=time[i]-date
        else: 
            dt=date-time[i]
        if dt>DtMax: 
            print 'loading radar_frame done but dt>DtMax !'
            print '  current time: %s'%date.isoformat()
            print '  radar range: %s to %s'%(time[0].isoformat(),time[-1].isoformat())
            #return {'date': time[i].isoformat(),'u': [],'v': []}

        u=self.nc_radar.variables['u'][i]
        v=self.nc_radar.variables['v'][i]

        vector = {'date': time[i].isoformat(),
                  'u':    (u.flat[self.radar_i0]*100).astype('i'),
                  'v':    (v.flat[self.radar_i0]*100).astype('i'),
                  'inds': self.radar_inds}

        print self.radar_grid['lon'].shape
        print self.radar_grid['lat'].shape
        print vector['u'].shape
        print vector['v'].shape
        print vector['u'].max()
        print vector['u'].min()
        print vector['v'].max()
        print vector['v'].min()
        print 'loading radar_frame done'

        return vector
        '''

    def wind_frame(self,tind):
        if not hasattr(self,'nc_wind'): self.nc_wind=netCDF.Dataset(WIND_DATA_URI)

        from dateutil import parser
        from netcdftime import utime
        import datetime

        # load wind times:
        tnum=self.nc_wind.variables['time'][:]
        tunits=self.nc_wind.variables['time'].units
        time=utime(tunits,calendar='standard').num2date(tnum)

        # current model date:
        date=self.dates[tind]

        # find nearest time in wind file and average data:
        if 0:
          try:
            i0=np.where(time<=date)[0][-1]
            i1=np.where(time>date)[0][0]
          except:
            print 'loading wind error:'
            print '  - model time: %s'%date.isoformat()
            print '  - wind time range: %s to %s'%(time[0],time[-1])
            return dict(date=date,u=np.array(()),v=np.array(()),inds=np.array(()))
        else:
             i0=0
             i1=1

        d0=date-time[i0]
        d1=time[i1]-date
        a=d0.days+d0.seconds
        b=d1.days+d1.seconds


        u0=self.nc_wind.variables['Uwind'][i0]
        v0=self.nc_wind.variables['Vwind'][i0]

        u1=self.nc_wind.variables['Uwind'][i1]
        v1=self.nc_wind.variables['Vwind'][i1]

        u=(u0*b+u1*a)/(a+b)
        v=(v0*b+v1*a)/(a+b)

        vector = {'date': date.isoformat(),
                  'u':    (u.flat[self.wind_i0]*10).astype('i'),
                  'v':    (v.flat[self.wind_i0]*10).astype('i'),
                  'inds': self.wind_inds}

        return vector

    def buoys_frame(self,tind):
        # current model date: ---- TO FIX
        date=self.dates[tind]
        u=np.asarray([0,.5,1])
        v=np.asarray([.5,.5,.1])
        temp=np.asarray([24,24.5,25.3])
        vector={'date': date.isoformat(),
                  'u':    u,
                  'v':    v,
                  'temp':    temp,
                  'inds': self.buoys_inds}

        return vector

    def salt_frame(self, frame_number, num_levels=10, logspace=False,
                   cmap=None,varname='salt'):

        if self.isForec: frame_number=-1-frame_number

        print 'loading salt frame number %d, isforec=%d'%(frame_number,self.isForec)
        if varname=='speed':
          u=self.nc.variables['u'][frame_number, -1, :, :]
          v=self.nc.variables['v'][frame_number, -1, :, :]
          speed_=np.sqrt(u[:-1]**2+v[:,:-1]**2)
          speed=np.zeros((u.shape[0],)+(v.shape[1],),'f')
          speed[:-1,:-1]=speed_
          speed[-1,:]=speed[-2,:]
          speed[:,-1]=speed[:,-2]
          salt=speed
        else:
          salt = self.nc.variables[varname][frame_number, -1, :, :]

        if varname=='speed':
          salt=np.ma.masked_where(salt>1e3,salt)
        else:
          mask = self.ncg.variables['mask_rho'][:]
          salt=np.ma.masked_where(mask==0,salt)

#        salt[0,0]=-100
#        salt[0,1]=100

        if logspace:
          salt_range = (salt.max() - salt.min()) * 0.05
          levels = np.logspace(
                  np.log(salt.min() - salt_range),
                  np.log(salt.max() + salt_range),
                  num_levels, True, np.exp(1))
          levels=np.logspace(np.log(5),np.log(36),num_levels)
        else:
          if varname=='salt':
            levels=np.linspace(5,35,num_levels)
          elif varname=='temp':
            levels=np.linspace(20,24,num_levels)
          elif varname=='speed':
            levels=np.linspace(0,2,num_levels)

        plt.figure()
        if cmap is None:
          #try:
          if 1:
            #from cmocean.cm import salinity, temperature, speed
            from cmocean.cm import haline as salinity, thermal as temperature, speed
            if varname=='salt': cmap=salinity
            elif varname=='temp': cmap=temperature
            elif varname=='speed': cmap=speed
            #elif varname=='speed': cmap=plt.cm.PuRd
          #except ImportError:
          #  cmap = plt.cm.YlGnBu

        else:
            cmap = plt.cm.get_cmap(cmap)

        print levels
        contours = plt.contourf(self.salt_lon, self.salt_lat, salt, levels, cmap=cmap, extend='both')

        geojson = self.contours_to_geoJSON(contours)
        plt.close()

        frame = {'date': self.dates[frame_number].isoformat(),
                 'contours': geojson}

        print 'loading salt done'
        return frame

    def bathy_contours(self):
      print 'loading bathy...'
      plt.figure()
      contours = plt.contourf(self.salt_lon, self.salt_lat, self.ncg['h'][:,:], [50,100,200,500,1000],colors='k')
      geojson = self.contours_to_geoJSON(contours)
      plt.close()

      frame = {'date': None,
               'contours': geojson}

      print 'loading bathy done'
      return frame

    def contours_to_geoJSON(self, contours):
        features = []
        for collection, cvalue in zip(contours.collections, contours.cvalues):
            line_strings = []
            if np.isneginf(cvalue): cvalue=0
            if np.isposinf(cvalue): cvalue=100
            #if np.isneginf(cvalue) or np.isposinf(cvalue): continue
#            print '---->',cvalue
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
            print '-->--> ',cvalue, hex_color
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
    #if output_dir is None:
    #    output_dir = os.path.join(os.path.dirname(__file__),
    #                              '../static/data/json')
    #filename = partial(os.path.join, output_dir)
    #frame_source = THREDDSFrameSource(HINDCAST_CACHE_DATA_URI, decimate_factor=10)
    #write_vector(frame_source.velocity_grid, filename('grd_locations.json'))

    #for tidx in range(NFRAMES):
    #    vector = frame_source.velocity_frame(tidx)
    #    write_vector(vector, filename('step{}.json'.format(tidx)))


if __name__ == '__main__':
    main()
