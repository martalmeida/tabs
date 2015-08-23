import os
import shutil
import tempfile
import time

import numpy as np
from netCDF4 import Dataset

url = 'http://barataria.tamu.edu:8080/thredds/dodsC/NcML/txla_nesting6.nc'
local_filename = os.path.join(os.path.dirname(__file__),
                              '../static/data/txla_nesting6.nc')
tmp_nam = tempfile.mktemp()

n_time_steps = 90

tic = time.time()
in_nc = Dataset(url, 'r')
out_nc = Dataset(tmp_nam, 'w')
out_nc.createDimension('ocean_time', n_time_steps)
out_nc.createDimension('s_rho', 2)   # surface only
out_nc.createDimension('eta_psi', 190)
out_nc.createDimension('xi_psi', 670)
out_nc.createDimension('eta_rho', 191)
out_nc.createDimension('xi_rho', 671)
out_nc.createDimension('eta_u', 191)
out_nc.createDimension('xi_u', 670)
out_nc.createDimension('eta_v', 190)
out_nc.createDimension('xi_v', 671)

ocean_time = in_nc.variables['ocean_time'][:]
out_nc.createVariable('ocean_time', ocean_time.dtype, 'ocean_time')
out_nc.variables['ocean_time'][:] = ocean_time[:n_time_steps]

for prefix in ['lon', 'lat', 'mask']:
    for suffix in ['psi', 'rho']:
        var_name = "{}_{}".format(prefix, suffix)
        print(var_name)
        var = in_nc.variables[var_name][:]
        out_nc.createVariable(var_name, var.dtype, ('eta_{}'.format(suffix),
                                                    'xi_{}'.format(suffix)))
        out_nc.variables[var_name][:] = var
	del var

print('angle')
angle = in_nc.variables['angle'][:]
out_nc.createVariable('angle', angle.dtype, ('eta_rho', 'xi_rho'))
out_nc.variables['angle'][:] = angle
del angle


print('u')
u0 = in_nc.variables['u'][:n_time_steps, :1, :, :]
u1 = in_nc.variables['u'][:n_time_steps, -1:, :, :]
u = np.hstack((u0, u1))
u.mask = u == u0.fill_value
out_nc.createVariable('u', u.dtype, ('ocean_time', 's_rho', 'eta_u', 'xi_u'))
out_nc.variables['u'][:] = u
del u, u0, u1

print('v')
v0 = in_nc.variables['v'][:n_time_steps, :1, :, :]
v1 = in_nc.variables['v'][:n_time_steps, -1:, :, :]
v = np.hstack((v0, v1))
del v1
v.mask = v == v0.fill_value
del v0
out_nc.createVariable('v', v.dtype, ('ocean_time', 's_rho', 'eta_v', 'xi_v'))
out_nc.variables['v'][:] = v
del v

print('salt')
salt0 = in_nc.variables['salt'][:n_time_steps, :1, :, :]
salt1 = in_nc.variables['salt'][:n_time_steps, -1:, :, :]
salt = np.hstack((salt0, salt1))
salt.mask = salt == salt0.fill_value
out_nc.createVariable(
    'salt', salt.dtype, ('ocean_time', 's_rho', 'eta_rho', 'xi_rho'))
out_nc.variables['salt'][:] = salt
del salt

in_nc.close()
out_nc.close()

shutil.move(tmp_nam, local_filename)

print("{} seconds".format(time.time() - tic))
