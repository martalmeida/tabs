#from okean import netcdf
#from okean import roms, calc
import pylab as pl
import numpy as np
import os
import netCDF4
from netcdftime import utime

#def find_xylim():
#  grd='/home/mma/Documents/TABS/tabs/tabs/txla_grd_v4_new.nc4'
#  g=roms.Grid(grd)
#  xb,yb=g.border()
#  return (xb.min(),xb.max()),(yb.min(),yb.max())

def isiterable(*args):
  try:
    for a in args: iter(a)
    return True
  except: return False

def inpolygon(x,y,xp,yp):
  from matplotlib.path import Path
  verts=np.array(zip(xp,yp))
  p=Path(verts)
  if not isiterable(x,y): x,y,itr=[x],[y],0
  else: itr=1
  res=[p.contains_point((x[i],y[i]), radius=0.) for i in range(len(x))]
  res=np.asarray(res,'bool')
  if not itr: res=res[0]
  return res

def var_border(v,di=1,dj=1):
  '''
  Border of 2d numpy array
  di,dj is the interval between points along columns and lines
  Corner points are kept even with di and dj not 1
  '''
  j,i=v.shape
  if (di,dj)==(1,1):
    xb=np.arange(2*i+2*j,dtype=v.dtype)
    yb=np.arange(2*i+2*j,dtype=v.dtype)

    xb[0:j]       = v[:,0]
    xb[j:j+i]     = v[-1,:]
    xb[j+i:j+i+j] = np.flipud(v[:,-1])
    xb[j+i+j:]    = np.flipud(v[0,:])
  else:
    # ensure corner points are kept!!
    tmp1 = v[::dj,0]
    tmp2 = v[-1,::di]
    tmp3 = np.flipud(v[:,-1])[::dj]
    tmp4 = np.flipud(v[0,:])[::di]
    xb=np.concatenate((tmp1,tmp2,tmp3,tmp4))

  return xb


def find_radar_ijlimits(nc,xlim,ylim):
  fsave='radar_ijlims.txt'
  if os.path.isfile(fsave):
    return np.loadtxt(fsave,'i')

  x=nc.variables['lon'][:]
  y=nc.variables['lat'][:]

  # valid for 1d lon and lat only ! use okean.calc.ij_inds for 2d coords
  L=y.size
  M=x.size
  i1,=np.where(x<xlim[0])
  i1=i1[-1] if len(i1) else 0

  i2,=np.where(x>xlim[1])
  i2=i2[0] if len(i2) else M

  j1,=np.where(y<ylim[0])
  j1=j1[-1] if len(j1) else 0

  j2,=np.where(y>ylim[1])
  j2=j2[0] if len(j2) else L

  np.savetxt(fsave,[i1,i2,j1,j2],fmt='%d')
  return i1,i2,j1,j2


class TXLARadar:
  def __init__(self,grd_xy,step=3,ntimes_max=480): # set limits as (self.salt_lon.min(),self.salt_lon.max()), etc
    self.url='http://hfrnet.ucsd.edu/thredds/dodsC/HFR/USEGC/6km/hourly/RTV/HFRADAR,_US_East_and_Gulf_Coast,_6km_Resolution,_Hourly_RTV_best.ncd'
    self.nc=netCDF4.Dataset(self.url)

    self.step=step
    self.ntimes_max=ntimes_max

    # get xlim, ylim:
    self.grd_lon,self.grd_lat=grd_xy
    xlim=self.grd_lon.min(),self.grd_lon.max()
    ylim=self.grd_lat.min(),self.grd_lat.max()

    # get ij limits:
    self.ijlims=find_radar_ijlimits(self.nc,xlim,ylim)

    # load lon,lat and time
    self.load_xy()
    self.load_time()

  def load_xy(self):
    i0,i1,j0,j1=self.ijlims
    lon=self.nc.variables['lon'][i0:i1:self.step]
    lat=self.nc.variables['lat'][j0:j1:self.step]
    self.lon,self.lat=np.meshgrid(lon,lat)

    # also check inpolygon: (do not show outside domain)
    xb=var_border(self.grd_lon)
    yb=var_border(self.grd_lat)
    inp=inpolygon(self.lon.flat,self.lat.flat,xb,yb)
    inp.shape=self.lon.shape
    self.mask0=~inp

  def load_time(self):
    tnum=self.nc.variables['time'][-self.ntimes_max:]
    tunits=self.nc.variables['time'].units
    self.time=utime(tunits,calendar='standard').num2date(tnum)
    ind0=self.nc.variables['time'].size-self.ntimes_max
    ind1=self.nc.variables['time'].size
    self.time_inds=range(ind0,ind1)

  def load_uv_at_tind(self,tind):
    tind=self.time_inds[tind] # cos of ntimes_max
    print 'tind=',tind
    i0,i1,j0,j1=self.ijlims
    u=self.nc.variables['u'][tind,j0:j1:self.step,i0:i1:self.step]
    v=self.nc.variables['v'][tind,j0:j1:self.step,i0:i1:self.step]
    mask=np.isnan(u)|np.isnan(v)
    mask=mask|self.mask0 # exclude data outside model domain
    return np.ma.masked_where(mask,u),np.ma.masked_where(mask,v)

  def load_uv_at_date(self,date):
    if not hasattr(self,'time'): self.load_time()
    try:
      ti0=np.where(self.time<=date)[0][-1]
      ti1=np.where(self.time>=date)[0][0]
    except:
      return np.array(()),np.array(()),'cannot find %s in range %s:%s'%(date,self.time[0],self.time[-1])

    u0,v0=self.load_uv_at_tind(ti0)
    if ti0==ti1:
      u,v=u0,v0
    else:
      d0=date-time[ti0]
      d1=time[ti1]-date
      a=d0.days+d0.seconds
      b=d1.days+d1.seconds

      u1,v1=self.load_uv_at_tind(ti1)
      u=(u0*b+u1*a)/(a+b)
      v=(v0*b+v1*a)/(a+b)
    return u,v,'' # empty status message
