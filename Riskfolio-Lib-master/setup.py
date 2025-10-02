# Copyright (C) 2020-2025 Dany Cajas

import os
import numpy as np

from pybind11.setup_helpers import Pybind11Extension, build_ext
from setuptools import setup

MAJOR = 7
MINOR = 0
MICRO = 1
VERSION = '%d.%d.%d' % (MAJOR, MINOR, MICRO)

def write_version_py(filename='riskfolio/version.py'):
    cnt = """
# THIS FILE IS GENERATED FROM RISKFOLIO-LIB SETUP.PY
version = '%(version)s'
    """
    a = open(filename, 'w')
    try:
        a.write(cnt % {'version': VERSION,})
    finally:
        a.close()

write_version_py()

DESCRIPTION = "Portfolio Optimization and Quantitative Strategic Asset Allocation in Python"

with open("README.md", encoding='UTF-8') as fh:
    LONG_DESCRIPTION = fh.read()

DISTNAME = 'Riskfolio-Lib'
MAINTAINER = 'Dany Cajas'
MAINTAINER_EMAIL = 'dany.cajas.n@uni.pe'
URL = 'https://github.com/dcajasn/Riskfolio-Lib'
LICENSE = 'BSD (3-clause)'
KEYWORDS = 'finance, portfolio, optimization, quant, asset, allocation, investing'
DOWNLOAD_URL = 'https://github.com/dcajasn/Riskfolio-Lib.git'
PYTHON_REQUIRES = ">=3.9"

INSTALL_REQUIRES = [
    'numpy>=1.24.0',
    'scipy>=1.10.0',
    'pandas>=2.0.0',
    'matplotlib>=3.8.0',
    'clarabel>=0.6.0',
    'cvxpy>=1.5.2',
    'scikit-learn>=1.3.0',
    'statsmodels>=0.13.5',
    'arch>=7.0',
    'xlsxwriter>=3.1.2',
    'networkx>=3.0',
    'astropy>=5.1',
    'pybind11>=2.10.1',
]

PACKAGES = [
    'riskfolio',
    'riskfolio.src',
    'riskfolio.external',
]

CLASSIFIERS = [
    'Intended Audience :: Financial and Insurance Industry',
    'Intended Audience :: Science/Research',
    'Programming Language :: Python :: 3.9',
    'Programming Language :: Python :: 3.10',
    'Programming Language :: Python :: 3.11',
    'Programming Language :: Python :: 3.12',
    'License :: OSI Approved :: BSD License',
    'Topic :: Office/Business :: Financial :: Investment',
    'Topic :: Office/Business :: Financial',
    'Topic :: Scientific/Engineering :: Mathematics',
    'Operating System :: Microsoft',
    'Operating System :: Unix',
    'Operating System :: MacOS'
]


if __name__ == "__main__":

    from setuptools import Extension, setup, find_packages
    import sys

    if sys.version_info[:2] < (3, int(PYTHON_REQUIRES[-1])):
        raise RuntimeError("Riskfolio-Lib requires python " + PYTHON_REQUIRES)

    # Obtain the numpy include directory.  This logic works across numpy versions.
    try:
        numpy_include = np.get_include()
    except AttributeError:
        numpy_include = np.get_numpy_include()

    WIN = sys.platform.startswith("win32")
    eigen_path = os.path.abspath(os.path.join('.', 'lib', 'eigen-3.4.0', 'Eigen'))
    eigen_core_path = os.path.abspath(os.path.join('.', 'lib', 'eigen-3.4.0'))
    eigen_unsupported_path = os.path.abspath(os.path.join('.', 'lib', 'eigen-3.4.0', 'unsupported'))
    spectra_path = os.path.abspath(os.path.join('.', 'lib', 'spectra-1.0.1', 'include'))
    external_path = os.path.abspath(os.path.join('.', 'riskfolio', 'external'))

    sources = [os.path.join('riskfolio', 'external', 'cpp_functions_bindings.cpp')]
    if WIN:
        external_module = Pybind11Extension('riskfolio.external.functions',
            sources=sources,
            include_dirs = [numpy_include, eigen_path, eigen_core_path, eigen_unsupported_path, spectra_path,external_path,external_path],
            extra_compile_args = ['-O2', '-Ofast', '-msse2'],
            define_macros = [('VERSION_INFO', VERSION)],
            )
    else:
        external_module = Pybind11Extension('riskfolio.external.functions',
            sources=sources,
            include_dirs = [numpy_include, eigen_path, eigen_core_path, eigen_unsupported_path, spectra_path, external_path,external_path],
            extra_compile_args = ['-O2', '-Ofast'],
            define_macros = [('VERSION_INFO', VERSION)],
            )

    setup(
        name=DISTNAME,
        author=MAINTAINER,
        author_email=MAINTAINER_EMAIL,
        maintainer=MAINTAINER,
        maintainer_email=MAINTAINER_EMAIL,
        description=DESCRIPTION,
        long_description=LONG_DESCRIPTION,
        long_description_content_type='text/markdown; charset=UTF-8; variant=GFM',
        license=LICENSE,
        keywords=KEYWORDS,
        url=URL,
        version=VERSION,
        download_url=DOWNLOAD_URL,
        python_requires=PYTHON_REQUIRES,
        install_requires=INSTALL_REQUIRES,
        packages=PACKAGES,
        classifiers=CLASSIFIERS,
        project_urls={"Documentation": "https://riskfolio-lib.readthedocs.io/en/latest/",
                      "Issues": "https://github.com/dcajasn/Riskfolio-Lib/issues",
                      "Personal website": "http://financioneroncios.wordpress.com",
                      },
        cmdclass={"build_ext": build_ext},
        ext_modules=[external_module],
    )