export const MODEL_CONFIGS = {
    'mrms': {
        vars: [
            "MergedReflectivityQCComposite_00.50",
             "CREF_1HR_MAX_00.50", 
             "MergedZdr_04.00", 
             "MergedRhoHV_04.00",                     
             "RotationTrackML60min_00.50",
            "RotationTrackML360min_00.50",
            "RotationTrackML30min_00.50",
            "RotationTrackML240min_00.50",
            "RotationTrackML1440min_00.50",
            "RotationTrackML120min_00.50",
            "RotationTrack60min_00.50",
            "RotationTrack360min_00.50",
            "RotationTrack30min_00.50",
            "RotationTrack240min_00.50",
            "RotationTrack1440min_00.50",
            "RotationTrack120min_00.50",
            "MESH_Max_60min_00.50",
            "MESH_Max_360min_00.50",
            "MESH_Max_30min_00.50",
            "MESH_Max_240min_00.50",
            "MESH_Max_1440min_00.50",
            "MESH_Max_120min_00.50",
            "MESH_00.50",
            "FLASH_QPE_ARIMAX_00.00",
            "FLASH_QPE_ARI30M_00.00",
            "FLASH_QPE_ARI24H_00.00",
            "FLASH_QPE_ARI12H_00.00",
            "FLASH_QPE_ARI06H_00.00",
            "FLASH_QPE_ARI03H_00.00",
            "FLASH_QPE_ARI01H_00.00",
            "LightningProbabilityNext60minGrid_scale_1",
            "LightningProbabilityNext30minGrid_scale_1",
            "VIL_Max_1440min_00.50",
            "VIL_Max_120min_00.50",
            "VIL_Density_00.50",
            "VIL_00.50",
            "LVL3_HighResVIL_00.50",
            "ptypeRefl", 
            "MergedAzShear_0-2kmAGL_00.50",
            "MergedAzShear_3-6kmAGL_00.50",
        ],
        name: 'MRMS',
    },
    'arome1': {
        bounds: [-12, 37.5, 16, 55.4],
        max_zoom: 7,
        vars: ['csnow_total', 'gust_runmax', 'rainRefl', 'snowRefl', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'irsat', 'refc_0', 'hcc_0', 'mcc_0', 'lcc_0', 'thetaE', 'atemp', 'vo_10', '2t_2', 'gust_0', 'moistureConvergence', 'cape_25500', '2d_2', '2r_2', 'wind_speed_10', 'wind_direction_10'],
        category: 'Mesoscale',
        name: 'AROME 1km',
        skewt: false,
        pressureLvls: [
        ],
        order: 12,
    },
    'arome25': {
        bounds: [-12, 37.5, 16, 55.4],
        max_zoom: 7,
        vars: ['csnow_total', 'gust_runmax', 'rainRefl', 'snowRefl', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'd_850', 'd_925', 'fgen_700', 'fgen_850', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'lapse_rates_500700', 'mslma_0', 't_700', 't_850', 't_925', 'tadv_700', 'tadv_850', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925', 'refc_500', 'hcc_0', 'mcc_0', 'lcc_0', 'thetaE', 'atemp', 'vo_10', '2t_2', 'moistureConvergence', 'cape_25500', '2d_2', '2r_2', 'wind_speed_10', 'wind_direction_10'],
        category: 'Mesoscale',
        name: 'AROME 2.5km',
        skewt: true,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 550, 
            600, 650, 700, 750, 800, 850, 900, 925, 950, 1000
        ], 
        order: 13,
    },
    'arw': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925', '2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'ehi_1000', 'ehi_3000', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'moistureConvergence', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'mxuphl_5000', 'mxuphl_5000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0',  'refc_0', 'stp', 'supercellComposite', 't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tcc_0', 'thetaE', 'thickness', 'tp_0_total',         'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'WRF-ARW',
        skewt: true,
        pressureLvls: [
            200, 250, 300, 350, 400, 450, 500, 525, 550, 575, 
            600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 
            850, 875, 900, 925, 950, 975, 1000
        ],
        order: 5,
    },
    'arw2': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'ehi_1000', 'ehi_3000', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'moistureConvergence', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'mxuphl_5000', 'mxuphl_5000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0',  'refc_0', 'stp', 'supercellComposite', 't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tcc_0', 'thetaE', 'thickness', 'tp_0_total',         'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'WRF-ARW2',
        skewt: true,
        pressureLvls: [
            200, 250, 300, 350, 400, 450, 500, 525, 550, 575, 
            600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 
            850, 875, 900, 925, 950, 975, 1000
        ],
        order: 6,
    },
    'fv3': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'ehi_1000', 'ehi_3000', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'moistureConvergence', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'mxuphl_5000', 'mxuphl_5000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0',  'refc_0', 'stp', 'supercellComposite', 't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tcc_0', 'thetaE', 'thickness', 'tp_0_total',         'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'HRW FV3',
        skewt: true,  
        pressureLvls: [
            200, 250, 300, 350, 400, 450, 500, 525, 550, 575, 
            600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 
            850, 875, 900, 925, 950, 975, 1000
        ],
        order: 4,
    },
    'hrdps': {
        bounds: [-152.730672, 27.284598, -40.70856, 70.61148],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', 'mslma_0', 'gh_850',  'tcc_0',  'wind_speed_10', '2t_2', 'gh_700', 'lcl', 'crain', 'csnow', 'cicep', 'cfrzr', 't_850', 't_850iso0', 'wind_speed_925', 't_925', 't_925iso0', 'gh_500', '2d_2', 'wind_speed_700', 'cape_0', 'thickness', 'atemp', 'wind_speed_500', 'gust_0', 'lapse_rates_500700', 'gh_925', '2r_2', 'wind_speed_850',  't_500',   'thetaE', 't_700', 't_700iso0', 'wind_direction_10'],
        category: 'Mesoscale',
        name: 'HRDPS',
        skewt: false,
        order: 11,
    },
    'hrrr': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['hail', 'refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'skewt', 'slr', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12',  'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'bulk_shear_speed_0-6000', 'gh_500', 'irsat', 'lcl', 'stp', 't_850', 't_850iso0', 'cape_0',  'gh_700', 'gh_925', 'supercellComposite',  'lcc_0', 'lftx_500', 'ltng_0', 'mslma_0', 'thetaE',  'hcc_0', 't_700', 't_700iso0', 'w_850', 'cape_0-3000', 'atemp',   'wind_speed_925', 't_925', 't_925iso0', 'w_700', 'tts', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_700', 'refc_0',   'tehi', '2t_2', 'mxuphl_5000', 'mxuphl_5000_runmax', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_500', 'wind_speed_850', 'tcc_0', 'cin_0', 'ehi_3000', 'mcc_0',  'cin_25500', 'gh_850', 'vo_10', '2r_2', 'tadv_700', 'moistureConvergence', 'hlcy_3000', 'lapse_rates_500700', 'gust_0', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',  'hlcy_1000', 'pwat_0',  'cin_9000', 'cape_9000', 'ehi_1000', 'wind_speed_10', '2d_2', 'cape_25500', 'thickness', 'tadv_850', 'bulk_shear_speed_0-1000'],
        category: 'Mesoscale',
        name: 'HRRR',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 1,
    },
    'hrrrsub': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', 'uphl_5000', '2t_2', '2d_2', 'irsat', 'wind_speed_10', 'gust_0', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'refc_0', 'atemp'],
        category: 'Mesoscale',
        name: 'HRRR Sub-Hourly',
        pressureLvls: [],
        skewt: false,
        order: 2,
    },
    'icond2': {
        bounds: [-3.9399999999999977, 43.18, 20.34, 58.08],
        max_zoom: 7,
        vars: ['bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_3hr','csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'lcc_0', '2t_2', 't_500', 'hcc_0', 'wind_speed_700', 'mslma_0',  'atemp','t_700', 't_700iso0', 'cape_9000', 'lcl', '2d_2',  'mcc_0',  'wind_speed_10', 'lapse_rates_500700', '2r_2', 'crain', 'csnow', 'cicep', 'cfrzr', 'tcc_0', 'wind_speed_850', 't_850', 't_850iso0',  'wind_speed_500', 'thetaE',],
        category: 'Mesoscale',
        name: 'ICON-D2',
        skewt: false,
        order: 14,
    },
    'mpashn': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-HN',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 7,
    },
    'mpasht': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-HT',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 8,
    },
    'mpasrt': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-RT',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 9
    },
    'mpasrn': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-RN',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 7,
    },
    'mpasrn3': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-RN3',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 8,
    },
    'mpasht2': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-HTPO',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 9
    },
    'namnest': {
        bounds: [-152.87862250405013, 12.190000000000017, -49.415986585644376, 61.30935757335814],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cape_25500', 'cin_9000', 'cin_25500', 'd_850', 'd_925', 'ehi_1000', 'ehi_3000', 'fgen_700', 'fgen_850', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'irsat', 'ivt', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'mcc_0', 'mean700300mbRH', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0', 'r_700', 'r_850', 'r_925',  'refc_0', 'stp', 'supercellComposite', 't_500',  't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tadv_700', 'tadv_850', 'thetaE', 'thickness',   'vo_10', 'vo_500', 'vo_700', 'vo_850',  'w_700', 'w_850',         'wind_speed_10', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'NAM 3km CONUS',
        skewt: true,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 
            400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 
            700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000
        ],
        order: 3,
    },
    'rrfs': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['hail', 'vis_0', 'gust_runmax', 'tts', 'tehi', 'cape_0-3000', 'slr', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'bulk_shear_speed_0-6000', 'gh_500', 'irsat', 'lcl', 'stp', 't_850', 't_850iso0', 'cape_0', 'gh_700', 'gh_925', 'supercellComposite',  'lcc_0', 'lftx_500', 'mslma_0', 'thetaE',  'hcc_0', 't_700', 't_700iso0', 'atemp',   'wind_speed_925', 't_925', 't_925iso0', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_700', 'refc_0',   '2t_2', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_500', 'wind_speed_850', 'tcc_0', 'cin_0', 'ehi_3000', 'mcc_0',  'cin_25500', 'gh_850', 'vo_10', '2r_2', 'tadv_700', 'moistureConvergence', 'hlcy_3000', 'lapse_rates_500700', 'gust_0', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',  'hlcy_1000', 'pwat_0',  'cin_9000', 'cape_9000', 'ehi_1000', 'wind_speed_10', '2d_2', 'cape_25500', 'thickness', 'tadv_850', 'bulk_shear_speed_0-1000'],
        category: 'Mesoscale',
        name: 'RRFS A',
        skewt: true,
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        order: 10,
    },
    'arpege': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 3,
        vars: ['mslma_0', 'atemp', '2t_2', 'tcc_0',  '2d_2', '2r_2', 'wind_speed_10', 'gust_0', 'gust_runmax'],
        category: 'Global',
        name: 'ARPEGE',
        skewt: false,
        pressureLvls: [],
        order: 5,
    },
    'ecmwf': {
        max_zoom: 3,
        vars: ['gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', 'r_850', 'lapse_rates_500700',  'vo_850',  'thickness',   'wind_speed_700', 'd_850',  '2t_2', 'gh_925', 'r_925', 'w_500', 'lcl', 'tadv_850', 'divergence_200', 'crain', 'csnow', 'cicep', 'cfrzr', 'vo_500', 'd_700', 'gh_500', 'gh_850', 'w_925', 'cape_25500',  'mean700300mbRH', 't_925', 't_925iso0', 'tadv_300', 'fgen_700', 'wind_speed_925', 'vo_700', 'd_925', 'd_all_lvls', 'gh_300', 'wind_speed_500',   'r_300', 'wind_speed_10', 'fgen_850', '2d_2', 'mslma_0', 'r_500', 'gh_700', 'wind_speed_200', 'wind_speed_300', 'ivt', 'thetaE',  '2r_2', 't_500',  't_700', 't_700iso0', 'tadv_700',  'wind_speed_850', 't_850', 't_850iso0', 'divergence_850', 'w_700',  'gh_200', 'w_850', 'r_200', 'r_700', 'gust_0', 'atemp'],
        category: 'Global',
        name: 'ECMWF',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        pressureLvls: [
            100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000
        ],
        order: 2
    },
    'ecmwfaifs': {
        max_zoom: 3,
        vars: ["gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_6hr', 'tp_0_total', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'tadv_850',    'wind_speed_500',  'fgen_700', 'wind_speed_10', 'atemp', 'tp_0_total', 'tadv_300', 'lapse_rates_500700',  't_700', 't_700iso0',  'thetaE', 'wind_speed_200', 'wind_speed_700', 'wind_speed_925', 'ivt', 'vo_700', 'divergence_200', '2r_2', 'fgen_850', 'd_all_lvls', '2d_2', 'tadv_700', 't_925', 't_925iso0', 'vo_850', 'gh_700', '2t_2', 'mslma_0', 'r_925', 'lcl', 'gh_925', 't_850', 't_850iso0',  'w_850',  'gh_500', 'w_925',  'gh_850', 't_500',  'mean700300mbRH', 'divergence_850', 'thickness', 'w_500',  'r_700',  'wind_speed_850', 'wind_speed_300', 'vo_500', 'r_850', 'w_700'],
        category: 'Global',
        name: 'ECMWF-AIFS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        pressureLvls: [
            100, 150, 200, 250, 300, 400, 500, 600, 700, 
            850, 925, 1000
        ],
        order: 7,
    },
    'gem': {
        max_zoom: 3,
        vars: ['gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', 'fgen_850', 'cape_0',  'r_500', 'crain', 'csnow', 'cicep', 'cfrzr', 'gh_500', 'wind_speed_700', 'd_925',  'gust_0', 'gh_300', 'thickness', 'wind_speed_925', 'd_850', '2r_2', 'mslma_0', 'wind_speed_300', 't_500',   'w_850', 'vo_500', 'wind_speed_200', 'r_700', 'gh_925', 'divergence_850', 'vo_850', '2t_2',  'tadv_700',  't_925', 't_925iso0', 'tadv_850', 'gh_700', 'wind_speed_10', 'r_925', 'w_700', 'vo_700', 'atemp',  'lapse_rates_500700', 'gh_850', '2d_2', 'gh_200', 'r_850', 'tcc_0', 'w_500', 'cin_0',  'wind_speed_500', 'wind_speed_850', 't_850', 't_850iso0', 'thetaE', 'd_700', 'lcl', 'divergence_200', 'fgen_700', 't_700'],
        category: 'Global',
        name: 'GDPS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        order: 3,
    },
    'gfs': {
        max_zoom: 3,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0', 'crain_total', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'cin_0', 'wind_speed_700', 'wind_speed_200', 'divergence_200', 'd_925', 'tadv_300', 'w_850', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', '2t_2', 'lftx_0', 'refc_0', 'fgen_850', 'hcc_0', 'r_700', 't_850', 't_850iso0', 'r_850', 'tcc_0', 'hlcy_3000', 'thickness', 'vo_850', 'wind_direction_2000', 'r_500', 'gh_500', 'wind_speed_500', '2d_2', 'cape_25500', 'mcc_0', 'w_500', 'pwat_0', 'divergence_850', 't_500',  'wind_speed_850', 'lcl',   'cape_0', 'tadv_850', 'tadv_700', 'theta2PVU',  'wind_speed_2000', 'lapse_rates_500700', 'vo_500', 'irsat',   't_700', 't_700iso0', 'cin_25500', 'ehi_3000', 'lcc_0', 'gh_850', 'wind_speed_925', 'gh_200', 'wind_speed_300', 'fgen_700', 'vo_700',  'd_850', 'thetaE',   'pres2PVU', 'd_700', 'crain', 'csnow', 'cicep', 'cfrzr',  'w_700', 'gust_0', 'ivt',  'atemp', 'cape_9000', 'r_925', 'mslma_0', 'w_925', 'cin_9000', 'mean700300mbRH', 'wind_speed_10', 't_925', 't_925iso0', 'gh_925', 'gh_700',  'gh_300',  '2r_2'],
        category: 'Global',
        name: 'GFS',
        bounds: [-180, -90, 180, 90],
        skewt: true,
        pressureLvls: [
            100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 
            600, 650, 700, 750, 800, 850, 900, 925, 950, 975, 1000
        ],
        order: 1,
    },
    'graphcastgfs': {
        max_zoom: 3,
        vars: ["gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_6hr', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'gh_700', 'mean700300mbRH', 'd_925',   'gh_300', 'ivt', 'gh_925', 'mslma_0', 'lapse_rates_500700',  'tadv_300', 'fgen_700', 'r_500',  'wind_speed_700', 'wind_speed_850', 'fgen_850', 'w_500', 't_700', 't_700iso0', 'gh_200', 'w_925', 'tadv_850', 'tadv_700', '2t_2', 'r_700', 'd_all_lvls', 'wind_speed_300', 'd_700', 'divergence_850', 't_500',   'vo_850', 'w_850',    'vo_500', 'wind_speed_925', 't_925', 't_925iso0', 'tp_0_total', 'r_850', 'r_925', 'w_700', 't_850', 't_850iso0', 'gh_500',  'wind_speed_200', 'wind_speed_500',   'gh_850', 'd_850', 'thickness', 'divergence_200', 'vo_700'],
        category: 'Global',
        name: 'Graphcast GFS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        pressureLvls: [
            100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000
        ],
        order: 6
    },
    'gefs': {
        max_zoom: 3,
        vars: ["gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'cin_9000', 'r_850', 'gh_500', 'fgen_700', 'fgen_850', 't_500',   'wind_speed_850', 'wind_speed_300', 'lapse_rates_500700', 'cape_9000', 't_925', 't_925iso0', 'gh_850', '2r_2', 'gh_200',  'atemp',   'irsat', 'gh_300', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_10',  'tcc_0', 'wind_speed_700', 'd_850', 'gh_700', 'gh_925', 'wind_speed_500', '2t_2', 'lcl', 'tadv_850', 'divergence_850', 'pwat_0', 'r_700', 'tadv_700', 'divergence_200', 'thickness', 't_850', 't_850iso0', 'r_500', 'w_850', 't_700', 't_700iso0', 'thetaE', 'wind_speed_200', 'r_925',   'wind_speed_925', '2d_2', 'd_925', 'd_700'],
        category: 'Ensemble',
        name: 'GEFS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        order: 1,
    },
    'nbm': {
        bounds: [-138.3732681539599, 19.229000000000003, -59.04219006004567, 57.088589282434306],
        max_zoom: 7,
        vars: ['2t_2iso0','2d_2', '2r_2', '2t_2', 'atemp', 'cape_0', 'gust_0', 'lcl'],
        category: 'Ensemble',
        name: 'NBM',
        skewt: false,
        order: 2,
    },
    'href': {
        interval: 1,
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['vis_0', '2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'mslma_0', 'tadv_850', 'hlcy_3000', 'd_700', 'lcc_0', 'cape_0', 'wind_speed_700', 'crain', 'csnow', 'cicep', 'cfrzr',  'gh_500', 'gh_700', 'wind_speed_850', 'pwat_0', 'fgen_850', 'd_925',  'wind_speed_925', 't_850', 't_850iso0', 'fgen_700', 'lcl', '2t_2', 'mcc_0', 't_925', 't_925iso0', 'wind_speed_500', 'w_700', 'cape_9000',  'hcc_0',  'cin_0',  'tcc_0', 'cin_9000', 'tadv_700', 'gh_850', 't_500',  'd_850', 'ehi_3000', 't_700'],
        category: 'Ensemble',
        name: 'HREF',
        skewt: false,
        order: 3,
    },
    'iconeu': {
        bounds: [-23.5, 29.5, 62.5, 70.5],
        max_zoom: 7,
        vars: ['bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_3hr','csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'lapse_rates_500700', '2d_2', 't_850', 't_850iso0', 'wind_speed_500', 'wind_speed_925', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_850', 'tcc_0', 't_925', 't_925iso0', 'thetaE',  't_700', 't_700iso0', '2t_2', 't_500',  'cape_9000', 'hcc_0',  'atemp', 'lcc_0',  'wind_speed_10', 'lcl', 'mslma_0', 'mcc_0',  '2r_2', 'wind_speed_700', 'wind_direction_850'],
        category: 'Regional',
        name: 'ICON-EU',
        skewt: false,
        order: 4,
    },
    'nam': {
        bounds: [-152.87862250405013, 12.190000000000017, -49.415986585644376, 61.30935757335814],
        max_zoom: 3,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', "gh_tendency_500", 'ehi_1000', 'hlcy_1000', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', '2d_2', '2r_2', '2t_2', 'atemp', 'cape_25500', 'cin_25500', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'd_850', 'd_925', 'ehi_3000', 'fgen_700', 'fgen_850', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hlcy_3000', 'ivt', 'lapse_rates_500700', 'lcl', 'lftx_500', 'ltng_0', 'mean700300mbRH', 'mslma_0', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0', 'r_700', 'r_850', 'r_925',  'refc_0', 'stp', 't_500',  't_700', 't_700iso0', 't_850', 't_850iso0', 'supercellComposite', 't_925', 't_925iso0',  'tadv_700', 'tadv_850', 'tcc_0', 'thetaE', 'thickness',   'vo_500', 'vo_700', 'vo_850',  'w_700', 'w_850',        'wind_speed_10', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Regional',
        name: 'NAM',
        skewt: false,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 
            400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 
            700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000
        ],
        order: 2,
    },
    'arpegeeu': {
        bounds: [-32, 20, 42, 72],
        max_zoom: 3,
        vars: ['canosw_total', 'gust_0', 'gust_runmax', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'd_850', 'd_925', 'fgen_700', 'fgen_850', 'gh_500', 'gh_300', 'gh_200', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'lapse_rates_500700', 'mslma_0', 't_700', 't_850', 't_925', 'tadv_700', 'tadv_850', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925', 'thetaE', 'atemp', 'vo_10', '2t_2', 'moistureConvergence', 'cape_25500', '2d_2', '2r_2', 'wind_speed_10'],
        category: 'Regional',
        name: 'ARPEGE EU',
        skewt: true,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 550, 
            600, 650, 700, 750, 800, 850, 900, 925, 950, 1000
        ],
        order: 5,
    },
    'rap': {
        bounds: [-139.85612183699237, 16.281000000000002, -57.381070045718054, 58.365355471156114],
        max_zoom: 3,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', "gh_tendency_500", 'slr', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12',  'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cape_25500',  'cin_0', 'cin_9000', 'cin_25500', 'd_850', 'd_925', 'ehi_1000', 'ehi_3000', 'fgen_700', 'fgen_850', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'ivt', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'mean700300mbRH', 'moistureConvergence', 'mslma_0', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0', 'r_700', 'r_850', 'r_925',  'refc_0', 'stp', 'supercellComposite', 't_500',  't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tadv_700', 'tadv_850', 'tcc_0', 'tehi', 'thetaE', 'thickness', 'tts',   'vo_500', 'vo_700', 'vo_850',  'w_700', 'w_850',         'wind_speed_10', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Regional',
        name: 'RAP',
        skewt: true,
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        order: 1,
    },
    'rgem': {
        bounds: [-179.99976765517718, 17.34272612431937, -50, 89.95612441273688],
        max_zoom: 3,
        vars: ['gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', '2t_2', 'gh_300', 'mslma_0', 'lcl',  'r_925', 'cape_0', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_500',  'wind_speed_700', 'vo_850', 'tcc_0', '2r_2', 'gh_850', 'tadv_850', 'gh_200', 'r_700', 'gh_500', 'r_500', 'thickness', 'wind_speed_10', 'thetaE', 'w_700', 'vo_700', 'fgen_700', 'wind_speed_200', 't_925', 't_925iso0', 'wind_speed_300', 'w_850', 'd_925', '2d_2', 'lapse_rates_500700', 'wind_speed_925', 'd_700', 'fgen_850', 'gh_925', 't_500',  'vo_500', 'r_850',  'wind_speed_850',  'cin_0',  'atemp', 'w_500', 'tadv_700', 't_850', 't_850iso0', 'gh_700', 't_700', 't_700iso0', 'd_850', 'gust_0'],
        category: 'Regional',
        name: 'RGEM',
        skewt: false,
        order: 3,
    },

    'rtma': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['mslma_0', '2t_2iso0', '2d_2', '2r_2', '2t_2', 'atemp', 'gust_0', 'moistureConvergence', 'thetaE', 'wind_speed_10'],
        name: 'RTMA',
    },

    'hwrf': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['2t_2', 'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HWRF',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 1,
    },
    'hfsa': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['gust_0', '2t_2',  'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HAFS-A',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,524,550,575,600,625,650,657,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 3,
    },
    'hfsb': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['gust_0', '2t_2', 'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HAFS-B',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,524,550,575,600,625,650,657,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 4,
    },
    'hmon': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['2t_2', 'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HMON',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 2,
    },
}

export const BARB_FIELDS = [
    'wind_speed_10',
    'wind_speed_2000',
    'wind_speed_200',
    'wind_speed_250',
    'wind_speed_300',
    'wind_speed_500',
    'wind_speed_700',
    'wind_speed_850',
    'wind_speed_925',
    'bulk_shear_speedmb_925',
    'bulk_shear_speedmb_850',
    'bulk_shear_speedmb_700',
    'bulk_shear_speedmb_500',
    'bulk_shear_speed_0-1000',
    'bulk_shear_speed_0-6000',
]


export const DICTIONARIES = {
    fld: {
        "": {
            category: "",
            subCategory: "",
            variable: "",
            shortname: "",
            units: {
                "": {
                    min: 0,
                    max: 0,
                    intervals: [],
                },
            },
            
            description: '',
        },
        "mslma_0": {
            category: "Surface",
            subCategory: "Mean Sea Level Pressure",
            variable: "MSLP",
            shortname: "MSLP",
            units: {
                "hPa": {
                    min: 800,
                    max: 1100,
                    intervals: [2],
                },
            },
            description: '',
        },
        "2t_2": {
            category: "Surface",
            subCategory: "Temperature",
            variable: "2m Temperature",
            shortname: "2m Temp.",
            units: {
                "°F": {
                    min: -130,
                    max: 150,
                    intervals: [2],
                },
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            defaultUnit: '°C',
            description: '',
        },
        "2t_2iso0": {
            category: "Surface",
            subCategory: "Temperature",
            variable: "2m 0°C Isotherm",
            shortname: "2m 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "wet_bulb_2": {
            category: "Surface",
            subCategory: "Temperature",
            variable: "2m Wet Bulb Temperature",
            shortname: "2m Wb. Temp.",
            units: {
                "°C": {
                    min: -50,
                    max: 50,
                    intervals: [2],
                },
                "°F": {
                    min: -60,
                    max: 120,
                    intervals: [2],
                },
            },
            
            description: '',
        },
        "2d_2": {
            category: "Surface",
            subCategory: "Thermodynamics",
            variable: "2m Dewpoint",
            shortname: "2m Dpt.",
            units: {
                "°F": {
                    min: -80,
                    max: 90,
                    intervals: [2],
                },
                "°C": {
                    min: -70,
                    max: 50,
                    intervals: [2],
                },
            },
            defaultUnit: '°C',
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "d_925": {
            category: "Upper Air",
            subCategory: "Dewpoint",
            variable: "925mb Dewpoint",
            shortname: "925mb Dpt.",
            units: {
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "d_850": {
            category: "Upper Air",
            subCategory: "Dewpoint",
            variable: "850mb Dewpoint",
            shortname: "850mb Dpt.",
            units: {
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "d_700": {
            category: "Upper Air",
            subCategory: "Dewpoint",
            variable: "700mb Dewpoint",
            shortname: "700mb Dpt.",
            units: {
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "2r_2": {
            category: "Surface",
            subCategory: "Thermodynamics",
            variable: "2m Relative Humidity",
            shortname: "2m RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "cape_0": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Surface Based CAPE",
            shortname: "SBCAPE",
            units: {
                "J kg⁻¹": {
                    min: 100,
                    max: 10000,
                    intervals: [250],
                },
            },
            
            description: 'Surface Based Convective Available Potential Energy measures differences between a surface based air parcel temperature and the surrounding environment to the equilibrium level. It represents the potential for thunderstorms.',
        },
        "cape_0-3000": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "0-3km AGL CAPE",
            shortname: "3km CAPE",
            units: {
                "J kg⁻¹": {
                    min: 5,
                    max: 500,
                    intervals: [50],
                },
            },
            
            description: '3km Convective Available Potential Energy measures differences between a surface based air parcel temperature and the surrounding environment to 3km.',
        },
        "cape_25500": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Most Unstable CAPE",
            shortname: "MUCAPE",
            units: {
                "J kg⁻¹": {
                    min: 100,
                    max: 10000,
                    intervals: [250],
                },
            },
            
            description: 'Most Unstable Convective Available Potential Energy calculated using a the a parcel from the layer with highest instability.',
        },
        "cape_9000": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Mixed Layer CAPE",
            shortname: "MLCAPE",
            units: {
                "J kg⁻¹": {
                    min: 100,
                    max: 10000,
                    intervals: [250],
                },
            },
            description: 'Mixed Layer Convective Available Potential Energy calculated using a parcel lifted from the mixed layer, typically the layer of air between the surface and a point where the temperature inversion (cap) begins.',
        },
        "cin_0": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Surface Based CIN",
            shortname: "SBCIN",
            units: {
                "J kg⁻¹": {
                    min: -1000,
                    max: -50,
                    intervals: [50],
                },
            },
            description: 'Surface Based Convective Inhibition is the amount of energy that prevents an air parcel lifted from the surface from rising freely, acting as a cap on convection. It represents the negative buoyancy that must be overcome for convection to initiate.',
        },
        "cin_25500": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Most Unstable CIN",
            shortname: "MUCIN",
            units: {
                "J kg⁻¹": {
                    min: -1000,
                    max: -50,
                    intervals: [50],
                },
            },
            
            description: 'Most Unstable Convective Inhibition is the amount of energy that prevents an air parcel lifted from the most unstable layer from rising freely.',
        },
        "cin_9000": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Mixed Layer CIN",
            shortname: "MLCIN",
            units: {
                "J kg⁻¹": {
                    min: -1000,
                    max: -50,
                    intervals: [50],
                },
            },
            
            description: 'Mixed Layer Convective Inhibition is the amount of energy that prevents the most unstabel air parcel lifted from the mixed layer from rising freely. Typically extends from the surface to a capping invesion.',
        },
        "hcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "High Cloud Cover",
            shortname: "High Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds in the high cloud layer.',
        },
        "lcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "Low Cloud Cover",
            shortname: "Low Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds in thelow cloud layer.',
        },
        "mcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "Middle Cloud Cover",
            shortname: "Mid. Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds in the middle cloud layer.',
        },
        "tcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "Total Cloud Cover",
            shortname: "Total Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds across all layers of the atmosphere.',
        },
        "atemp": {
            category: "Surface",
            subCategory: "Temperature",
            variable: "Apparent Temperature",
            shortname: "ATemp.",
            units: {
                "°F": {
                    min: -90,
                    max: 150,
                    intervals: [5],
                },
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [3],
                },
            },
            defaultUnit: '°F',
            description: 'Index that represents how temperature feels to the human body considering factors like humidity and wind speed.',
        },
        "tp_0_total": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "Total Precipitation",
            shortname: "Total Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_0_1": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "1 Hour Precipitation",
            shortname: "1hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm": {
                    min: .025,
                    max: 25,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_3": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "3 Hour Precipitation",
            shortname: "3hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_6": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "6 Hour Precipitation",
            shortname: "6hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_12": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "12 Hour Precipitation",
            shortname: "12hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_24": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "24 Hour Precipitation",
            shortname: "24hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_48": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "48 Hour Precipitation",
            shortname: "48hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "prate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Precipitation Rate",
            shortname: "Precip. Rate",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: '',
        },
        "avg_prate_6hr": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Average Precipitation Rate 6hr",
            shortname: "Avg. Precip. Rate 6hr",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: '',
        },
        "avg_prate_3hr": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Average Precipitation Rate 3hr",
            shortname: "Avg. Precip Rate 3hr",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: '',
        },
        "snowRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Snow Rate",
            shortname: "Snow Rate",
            units: {
                "in/hr [10:1]": {
                    min: .05,
                    max: 30,
                    intervals: [1],
                },
                "cm/hr [10:1]": {
                    min: .1,
                    max: 36,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr [10:1]',
            description: 'Rate of snowfall given precipitation rate and where the model depicts snow falling, assuming a 10:1 ratio.',
        },
        "rainRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Rain Rate",
            shortname: "Rain Rate",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: 'Rate of rainfall given precipitation rate and where the model depicts rain falling.',
        },
        "icepRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Ice Pellets Rate",
            shortname: "Icep Rate",
            units: {
                "in/hr [3:1]": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr [3:1]": {
                    min: .1,
                    max: 36,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr [3:1]',
            description: 'Rate of ice pellets given precipitation rate and where the model depicts rain falling, assuming a 1:1 ratio.',
        },
        "frzrRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Freezing Rain Rate",
            shortname: "FRZR Rate",
            units: {
                "in/hr [3:1]": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr [3:1]": {
                    min: .1,
                    max: 36,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr [QPF]',
            description: 'Rate of freezing rain given precipitation rate and where the model depicts rain falling, assuming a 1:1 ratio.',
        },
        "csnow_total": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "Total Snow",
            shortname: "Total Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_1": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "1 Hour Snow",
            shortname: "1hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [10:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_3": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "3 Hour Snow",
            shortname: "3hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_6": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "6 Hour Snow",
            shortname: "6hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_12": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "12 Hour Snow",
            shortname: "12hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_24": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "24 Hour Snow",
            shortname: "24hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_48": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "48 Hour Snow",
            shortname: "48hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "cfrzr_total": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "Total Freezing Rain",
            shortname: "Total FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_1": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "1 Hour Freezing Rain",
            shortname: "1hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 2,
                    intervals: [0.1],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 5,
                    intervals: [0.2],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 50,
                    intervals: [2],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_3": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "3 Hour Freezing Rain",
            shortname: "3hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_6": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "6 Hour Freezing Rain",
            shortname: "6hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_12": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "12 Hour Freezing Rain",
            shortname: "12hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_24": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "24 Hour Freezing Rain",
            shortname: "24hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_48": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "48 Hour Freezing Rain",
            shortname: "48hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cicep_total": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "Total Sleet",
            shortname: "Total Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_1": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "1 Hour Sleet",
            shortname: "1hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 2,
                    intervals: [0.1],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 5,
                    intervals: [0.2],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 50,
                    intervals: [2],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_3": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "3 Hour Sleet",
            shortname: "3hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_6": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "6 Hour Sleet",
            shortname: "6hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_12": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "12 Hour Sleet",
            shortname: "12hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_24": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "24 Hour Sleet",
            shortname: "24hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_48": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "48 Hour Sleet",
            shortname: "48hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "crain_total": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "Total Rain",
            shortname: "Total Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_1": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "1 Hour Rain",
            shortname: "1hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm": {
                    min: .01,
                    max: 25,
                    intervals: [1],
                },
                "mm": {
                    min: 0.1,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_3": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "3 Hour Rain",
            shortname: "3hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_6": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "6 Hour Rain",
            shortname: "6hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .25,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_12": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "12 Hour Rain",
            shortname: "12hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .25,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_24": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "24 Hour Rain",
            shortname: "24hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_48": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "48 Hour Rain",
            shortname: "48hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "bulk_shear_speed_0-1000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "0-1km Bulk Shear",
            shortname: "1km Bulk Shear",
            units: {
                "kts": {
                    min: 10,
                    max: 90,
                    intervals: [5],
                },
                "m/s": {
                    min: 5,
                    max: 45,
                    intervals: [2],
                },
            },
            defaultUnit: 'kts',
            description: '1km Bulk Shear is the difference in wind vectors between the surface and 1km. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speed_0-6000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "0-6km Bulk Shear",
            shortname: "6km Bulk Shear",
            units: {
                "kts": {
                    min: 20,
                    max: 180,
                    intervals: [10],
                },
                "m/s": {
                    min: 10,
                    max: 90,
                    intervals: [4],
                },
            },
            defaultUnit: 'kts',
            description: '6km Bulk Shear is the difference in wind vectors between the surface and 6km. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_500": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-500mb Bulk Shear",
            shortname: "500mb Bulk Shear",
            units: {
                "kts": {
                    min: 20,
                    max: 180,
                    intervals: [10],
                },
                "m/s": {
                    min: 10,
                    max: 90,
                    intervals: [4],
                },
            },
            defaultUnit: 'kts',
            description: '500mb Bulk Shear is the difference in wind vectors between the surface and 500mb. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_700": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-700mb Bulk Shear",
            shortname: "700mb Bulk Shear",
            units: {
                "kts": {
                    min: 20,
                    max: 180,
                    intervals: [10],
                },
                "m/s": {
                    min: 10,
                    max: 90,
                    intervals: [4],
                },
            },
            defaultUnit: 'kts',
            description: '700mb Bulk Shear is the difference in wind vectors between the surface and 700mb. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_850": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-850mb Bulk Shear",
            shortname: "850mb Bulk Shear",
            units: {
                "kts": {
                    min: 10,
                    max: 90,
                    intervals: [5],
                },
                "m/s": {
                    min: 5,
                    max: 45,
                    intervals: [2],
                },
            },
            defaultUnit: 'kts',
            description: '850mb Bulk Shear is the difference in wind vectors between the surface and 850mb. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_925": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-925mb Bulk Shear",
            shortname: "925mb Bulk Shear",
            units: {
                "kts": {
                    min: 10,
                    max: 90,
                    intervals: [5],
                },
                "m/s": {
                    min: 5,
                    max: 45,
                    intervals: [2],
                },
            },
            defaultUnit: 'kts',
            description: '500mb Bulk Shear is the difference in wind vectors between the surface and 925mb. It can help determine the potential for rotating supercells.',
        },
        "divergence_200": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "200mb Divergence",
            shortname: "200mb Divergence",
            units: {
                "s⁻¹": {
                    min: -30,
                    max: 30,
                    intervals: [2],
                },
            },
            
            description: 'Divergence is the outward flow of air from a region of the atmosphere. 200mb divergence is associated with rising air at the surface.',
        },
        "divergence_850": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "850mb Divergence",
            shortname: "850mb Divergence",
            units: {
                "s⁻¹": {
                    min: -30,
                    max: 30,
                    intervals: [2],
                },
            },
            
            description: 'Divergence is the outward flow of air from a region of the atmosphere. 850mb divergence is associated with sinking air at the surface.',
        },
        "ehi_1000": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "1km Energy Helicity Index",
            shortname: "1km EHI",
            units: {
                "None": {
                    min: -20,
                    max: 20,
                    intervals: [2],
                },
            },
            
            description: '1km Energy Helicity Index (EHI) combines SBCAPE and 1km SRH to quantify the likelihood of tornadoes or low-level mesocyclones.',
        },
        "ehi_3000": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "3km Energy Helicity Index",
            shortname: "3km EHI",
            units: {
                "None": {
                    min: -20,
                    max: 20,
                    intervals: [2],
                },
            },
            
            description: '3km Energy Helicity Index (EHI) combines SBCAPE and 3km SRH to quantify the likelihood of supercell thunderstorms and helps asses potential for updraft rotation.',
        },
        "fgen_700": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "700mb Frontogenesis",
            shortname: "700mb FGEN.",
            units: {
                "°C/100km/3hr": {
                    min: 1,
                    max: 60,
                    intervals: [2],
                },
            },
            
            description: 'Frontogenesis is measure of how quickly temperature gradients intensify, leading to the formation or strengthing of a front. Large values of lower level frontogenesis are associated with increased lift.',
        },
        "fgen_850": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "850mb Frontogenesis",
            shortname: "850mb FGEN.",
            units: {
                "°C/100km/3hr": {
                    min: 1,
                    max: 60,
                    intervals: [2],
                },
            },
            
            description: 'Frontogenesis is measure of how quickly temperature gradients intensify, leading to the formation or strengthing of a front. Large values of lower level frontogenesis are associated with increased lift.',
        },
        "gh_tendency_500": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "12 Hour 500mb Geopotential Height Tendency",
            shortname: "12hr 500mb Height Tendency",
            units: {
                "dam": {
                    min: -60,
                    max: 60,
                    intervals: [5],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_200": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "200mb Geopotential Heights",
            shortname: "200mb Geo. Height",
            units: {
                "dam": {
                    min: 1080,
                    max: 1290,
                    intervals: [6],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_250": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "250mb Geopotential Heights",
            shortname: "250mb Geo. Height",
            units: {
                "dam": {
                    min: 1080,
                    max: 1290,
                    intervals: [6],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_300": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "300mb Geopotential Heights",
            shortname: "300mb Geo. Height",
            units: {
                "dam": {
                    min: 768,
                    max: 1000,
                    intervals: [6],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_500": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "500mb Geopotential Heights",
            shortname: "500mb Geo. Height",
            units: {
                "dam": {
                    min: 438,
                    max: 650,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_700": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "700mb Geopotential Heights",
            shortname: "700mb Geo. Height",
            units: {
                "dam": {
                    min: 249,
                    max: 350,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_850": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "850mb Geopotential Heights",
            shortname: "850mb Geo. Height",
            units: {
                "dam": {
                    min: 120,
                    max: 170,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_925": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "925mb Geopotential Heights",
            shortname: "925mb Geo. Height",
            units: {
                "dam": {
                    min: 48,
                    max: 120,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gust_0": {
            category: "Surface",
            subCategory: "Wind",
            variable: "Wind Gusts",
            shortname: "Wind Gusts",
            units: {
                "mph": {
                    min: 20,
                    max: 200,
                    intervals: [5],
                },
                "kts": {
                    min: 15,
                    max: 150,
                    intervals: [5],
                },
                "m/s": {
                    min: 10,
                    max: 80,
                    intervals: [2],
                },
                "km/h": {
                    min: 30,
                    max: 320,
                    intervals: [10],
                },
            },
            defaultUnit: 'mph',
            description: '',
        },
        "gust_runmax": {
            category: "Surface",
            subCategory: "Wind",
            variable: "Accumulated Max Wind Gusts",
            shortname: "Accum. Max Wind Gusts",
            units: {
                "mph": {
                    min: 20,
                    max: 200,
                    intervals: [5],
                },
                "kts": {
                    min: 15,
                    max: 150,
                    intervals: [5],
                },
                "m/s": {
                    min: 10,
                    max: 80,
                    intervals: [2],
                },
                "km/h": {
                    min: 30,
                    max: 320,
                    intervals: [10],
                },
            },
            defaultUnit: 'mph',
            description: '',
        },
        "uphl_5000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "5-2km Updraft Helicity",
            shortname: "5km UPHL",
            units: {
                "m²/s²": {
                    min: -1500,
                    max: 1500,
                    intervals: [50],
                },
            },
            
            description: '',
        },
        "hlcy_3000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "3km Storm Relative Helicity",
            shortname: "3km SRH",
            units: {
                "m²/s²": {
                    min: -1500,
                    max: 1500,
                    intervals: [50],
                },
            },
            
            description: 'Storm-Relative Helicity (SRH) is a measure of the potential for cyclonic updraft rotation in thunderstorms, calculated by assesing the wind shear relative to storm motion. SRH from 0-3km is most relavent to diagnose overall storm organization.',
        },
        "hlcy_1000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "1km Storm Relative Helicity",
            shortname: "1km SRH",
            units: {
                "m²/s²": {
                    min: -1500,
                    max: 1500,
                    intervals: [50],
                },
            },
            
            description: 'Storm-Relative Helicity (SRH) is a measure of the potential for cyclonic updraft rotation in thunderstorms, calculated by assesing the wind shear relative to storm motion. SRH from 0-1km is most relavent to diagnose tornado potential.',
        },
        "irsat": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "Simulated IR Brightness Temperature",
            shortname: "IRSAT",
            units: {
                "°C": {
                    min: -100,
                    max: 60,
                    intervals: [5],
                },
            },
            
            description: 'IR Birhgtness Temperature represents the radiative temperature of an object as inferred from infared satellite measurements. Colder brightness temperatures typically indicate high cloud tops, while warmer temepratures suggest lower clouds or clear skies.',
        },
        "ivt": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "Integrated Water Vapor Transport",
            shortname: "IVT",
            units: {
                "kg m⁻¹ s⁻¹": {
                    min: 250,
                    max: 2000,
                    intervals: [50],
                },
            },
            
            description: 'Integrated Water Vapor Transport (IVT) is a measure of the total amount of water vapor being transported through the atmosphere by wind. It is calculated by integrating the specific humidity and wind speed over a vertical column of the atmosphere. Higher IVT values lead to stronger moisture transport indicated a higher threat for heavy precipitation.',
        },
        "lapse_rates_500700": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "700-500mb Lapse Rate",
            shortname: "700-500mb Lapse Rate",
            units: {
                "°C km⁻¹": {
                    min: 1,
                    max: 15,
                    intervals: [1],
                },
            },
            
            description: '500-700mb Lapse rate describes the rate at which temperature decreases from 700mb to 500mb. Higher lapse rates indicate higher instability and potential for convection.',
        },
        "lcl": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Lifted Condensation Level Height",
            shortname: "LCL Height",
            units: {
                "m": {
                    min: 100,
                    max: 9000,
                    intervals: [100],
                },
                "ft": {
                    min: 500,
                    max: 30000,
                    intervals: [500],
                },
            },
            defaultUnit: 'm',
            description: 'Lifted Condensation Level (LCL) height is the altitude at which an air parcel, when lifted adiabatically, cools to its dew point and becomes saturated, leading to cloud formation. It is calculated using temperature and dewpoint: 125x(T-Td)',
        },
        "lftx_0": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Surface Lifted Index",
            shortname: "Surface Lifted Idx.",
            units: {
                "°C": {
                    min: -20,
                    max: -1,
                    intervals: [1],
                },
            },
            
            description: 'Surface Lifted Index is the temperature between an air parcel lifted from the surface and the environment at 500 hPa. More negative values indicate greater instability and higher potential for thunderstorms.',
        },
        "lftx_500": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "500mb Lifted Index",
            shortname: "500mb Lifted Idx.",
            units: {
                "°C": {
                    min: -20,
                    max: -1,
                    intervals: [1],
                },
            },
            
            description: '500mb Lifted Index is the temperature between an air parcel lifted from 500mb. Useful for diagnosing mid-level instability and elevated convection not rooted at the surface.',
        },
        "ltng_0": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "Lightning",
            shortname: "Lightning",
            units: {
                "flashes km⁻²/5 min": {
                    min: .01,
                    max: 25,
                    intervals: [1],
                },
            },
            
            description: 'Model dervived lightning strikes in km⁻²/5 min.',
        },
        "ltng_2": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "Lightning",
            shortname: "Lightning",
            units: {
                "flashes km⁻²/5 min": {
                    min: .01,
                    max: 25,
                    intervals: [1],
                },
            },
            
            description: 'Model dervived lightning strikes in km⁻²/5 min.',
        },
        "mean700300mbRH": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "Mean 700-300mb Relative Humidity",
            shortname: "Mean 700-300mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity averaged between 700-300mb. Ueful indicator for diagnosing the ability for cloud formation, deep convection, or precipitation.',
        },
        "moistureConvergence": {
            category: "Surface",
            subCategory: "Forcing",
            variable: "Moisture Convergence",
            shortname: "Moisture Convergence",
            units: {
                "s⁻¹": {
                    min: 5,
                    max: 50,
                    intervals: [5],
                },
            },
            
            description: 'Surface Moisture Convergence refers to the accumulation of water vapor near the surface due to converging airflows. Higher values are associated with rising air and heavy precipitation. It is calculated as the product of moisture content and horizontal wind convergence.',
        },
        "mxuphl_3000": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "0-3km Maximum Updraft Helicity",
            shortname: "3km Max Updraft Helicity",
            units: {
                "m²/s²": {
                    min: 2,
                    max: 300,
                    intervals: [5],
                },
            },
            
            description: '3km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is more often used to assess the potential for tornadoes and low-level mesocyclones.',
        },
        "mxuphl_5000": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "2-5km Maximum Updraft Helicity",
            shortname: "2-5km Max Updraft Helicity",
            units: {
                "m²/s²": {
                    min: 2,
                    max: 560,
                    intervals: [5],
                },
            },
            
            description: '2-5km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is most often used to gauge the potential for supercell thunderstorms, mid-level shear and storm organization.',
        },
        "mxuphl_3000_runmax": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "0-3km Maximum Updraft Helicity (Run Max)",
            shortname: "3km Max Updraft Helicity (Max)",
            units: {
                "m²/s²": {
                    min: 3,
                    max: 300,
                    intervals: [5],
                },
            },
            
            description: '3km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is more often used to assess the potential for tornadoes and low-level mesocyclones.',
        },
        "mxuphl_5000_runmax": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "2-5km Maximum Updraft Helicity (Run Max)",
            shortname: "2-5km Max Updraft Helicity (Run)",
            units: {
                "m²/s²": {
                    min: 3,
                    max: 560,
                    intervals: [5],
                },
            },
            
            description: '2-5km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is most often used to gauge the potential for supercell thunderstorms, mid-level shear and storm organization.',
        },
        "pres2PVU": {
            category: "Upper Air",
            subCategory: "Pressure",
            variable: "Dynamic Tropopause Pressure",
            shortname: "2PVU Pres.",
            units: {
                "hPa": {
                    min: 20,
                    max: 850,
                    intervals: [15],
                },
            },
            
            description: 'Dynamic Tropopause Pressure is calculated by analyzing the pressure at the 2PVU level. It asses at what pressure level the tropopause lies.',
        },
        "csnow": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Snow",
            shortname: "Categorical Snow",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Snow is a binary model field that show whether or not it is snowing at a particular point.',
        },
        "cfrzr": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Freezing Rain",
            shortname: "Categorical FRZR.",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Freezing Rain is a binary model field that show whether or not there is freezing rain at a particular point.',
        },
        "crain": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Rain",
            shortname: "Categorical Rain",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Rain is a binary model field that show whether or not there is rain at a particular point.',
        },
        "cicep": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Ice Pellets",
            shortname: "Categorical ICEP.",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Ice Pellets is a binary model field that show whether or not there is ice pellets at a particular point.',
        },
        "rainRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Rain Composite Reflectivity",
            shortname: "Rain Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Rain shows reflectivity where the model shows categorical rain.',
        },
        "snowRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Snow Composite Reflectivity",
            shortname: "Snow Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Snow shows reflectivity where the model shows categorical snow.',
        },
        "icepRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Ice Pellets Composite Reflectivity",
            shortname: "ICEP. Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Ice Pellets shows reflectivity where the model shows categorical ice pellets.',
        },
        "frzrRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Freezing Rain Composite Reflectivity",
            shortname: "FRZR. Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Freezing Rain shows reflectivity where the model shows categorical freezing rain.',
        },
        "pwat_0": {
            category: "Precipitation",
            subCategory: "Moisture",
            variable: "Precipitable Water",
            shortname: "PWAT",
            units: {
                "in": {
                    min: 0,
                    max: 4,
                    intervals: [0.25],
                },
                "mm": {
                    min: 0,
                    max: 90,
                    intervals: [5],
                },
            },
            defaultUnit: 'in',
            description: 'Precipitable Water (PWAT) is the total amount of water vapor in a verticalcolumn of the atmosphere, expressed as the depth of water that would result if all the moisture in the column were to condense. High PWAT values indicate more moisture in the atmosphere, suggesting higher potential for heavy precipitation.',
        },
        "r_500": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "500mb Relative Humidity",
            shortname: "500mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "r_700": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "700mb Relative Humidity",
            shortname: "700mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "r_850": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "850mb Relative Humidity",
            shortname: "850mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "r_925": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "925mb Relative Humidity",
            shortname: "925mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "vis_0": {
            category: "Surface",
            subCategory: "Visibility",
            variable: "Visibility",
            shortname: "Vis.",
            units: {
                "mi": {
                    min: 0,
                    max: 10,
                    intervals: [0.1],
                },
                "km": {
                    min: 0,
                    max: 10,
                    intervals: [0.1],
                },
            },
            description: 'Visibility',
        },
        "mxrefc_1000": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Max Reflectivity (1 hr.)",
            shortname: "Max Composite Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            description: 'Simulated Radar.',
        },
        "refd_1000": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "1km Base Reflectivity",
            shortname: "1km Base Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            description: 'Simulated Radar.',
        },
        "refc_0": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Composite Reflectivity",
            shortname: "Composite Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Simulated Radar.',
        },
        "refc_500": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Composite Reflectivity 500m",
            shortname: "Composite Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Simulated Radar.',
        },
        "stp": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Significant Tornado Parameter",
            shortname: "STP",
            units: {
                "None": {
                    min: 1,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Significant Tornado Parameter (STP) is a composite index used to assess the likelihood of sifniciant tornadoes. It is calculated using SBCAPE, LCL height, 1km SRH and 6km Bulk Shear.',
        },
        "supercellComposite": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Supercell Composite",
            shortname: "Supercell Composite",
            units: {
                "None": {
                    min: 1,
                    max: 50,
                    intervals: [1],
                },
            },
            
            description: 'Supercell Composite is a composite index used to evaluated the potential for supercell thunderstorms. It is calculated using MUCAPE Effective SRH and Effective Shear.',
        },
        "t_500": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "500mb Temperature",
            shortname: "500mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_700": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "700mb Temperature",
            shortname: "700mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_850": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "850mb Temperature",
            shortname: "850mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_925": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "925mb Temperature",
            shortname: "925mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_925iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "925mb 0°C Isotherm",
            shortname: "925mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "t_850iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "850mb 0°C Isotherm",
            shortname: "850mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "t_700iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "700mb 0°C Isotherm",
            shortname: "700mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "t_500iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "500mb 0°C Isotherm",
            shortname: "500mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "tadv_300": {
            category: "Upper Air",
            subCategory: "Thermodynamics",
            variable: "300mb Temperature Advection",
            shortname: "300mb Temp. Adv.",
            units: {
                "°C h⁻¹": {
                    min: -20,
                    max: 20,
                    intervals: [2],
                },
            },
            
            description: '300mb Temperature Advection is useful for determining the sign of the secnd term of the QG height tendency equation. Strong Cold (Warm) air advection at 300mb is associated with 500mb geopotential height increases (decreases).',
        },
        "tadv_700": {
            category: "Upper Air",
            subCategory: "Thermodynamics",
            variable: "700mb Temperature Advection",
            shortname: "700mb Temp. Adv.",
            units: {
                "°C h⁻¹": {
                    min: -20,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Temperature Advection measures the horizontal movement of air that carries temperatures from one region to another. Positive advection warms an area while negative advection cools it. Strong warm advection is associated with upward motion.',
        },
        "tadv_850": {
            category: "Upper Air",
            subCategory: "Thermodynamics",
            variable: "850mb Temperature Advection",
            shortname: "850mb Temp. Adv.",
            units: {
                "°C h⁻¹": {
                    min: -20,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Temperature Advection measures the horizontal movement of air that carries temperatures from one region to another. Positive advection warms an area while negative advection cools it. Strong warm advection is associated with upward motion.',
        },
        "tehi": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Tornadic Energy Helicity Index",
            shortname: "TEHI",
            units: {
                "None": {
                    min: 1,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Tornadic Energy helicity Index (TEHI) is a parameter used to asses the potential for tornadoes. This parameter consolidates EHI to more percisely define areas that support tornadic supercells. It is calculated using 1km SRH, MLCAPE, 3km CAPE, 6km Bulk Shear, LCL height and MLCIN..',
        },
        "tts": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Tornadic Tilting and Stretching",
            shortname: "TTS",
            units: {
                "None": {
                    min: 1,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Tornadic Tiling and Strecthing (TTS) is a paramter used to asses the potential for tornadoes, specifically in low CAPE, high shear environments during the cool season. The parameter picks out areas of tilting and strecthing or horizontal, streamwise vorticity in updrafts. It is calculated using 1km SRH, MLCAPE, 3km CAOE, 6km Bulk Shear, LCL height and MLCIN.',
        },
        "thetaE": {
            category: "Surface",
            subCategory: "Thermodynamics",
            variable: "2m Theta-E",
            shortname: "2m Theta-E",
            units: {
                "°K": {
                    min: 230,
                    max: 370,
                    intervals: [5],
                },
            },
            
            description: '2m Theta-E (Equivalent Potential Temperature) represents the potential temperature of a parcel of air has been lifted from the surface and all its water vapor has been condensed. It is useful for determining air parcel stability, with higher values indicating more moisture and greater instability.',
        },
        "theta2PVU": {
            category: "Upper Air",
            subCategory: "Isentropic",
            variable: "Dynamic Tropopause Theta-E",
            shortname: "2PVU Theta-E",
            units: {
                "°K": {
                    min: 230,
                    max: 495,
                    intervals: [5],
                },
            },
            
            description: 'Dynamic Tropopause Theta-E is the potential temperature along the 2PVU surface. It can help identify strong thermal gradients which can be associated with jet streams. Lower values indicate the tropopause is closer to the surface.',
        },
        "thickness": {
            category: "Upper Air",
            subCategory: "Thickness",
            variable: "1000-500mb Thickness",
            shortname: "Thickness",
            units: {
                "dam": {
                    min: 438,
                    max: 630,
                    intervals: [6],
                },
            },
            
            description: '1000-500mb Thickness subtracts the geopotential height from 1000mb and 500mb to get a vertical distance between the two layers. Higher (lower) thickness values are associated with warmer (colder) air.',
        },
        "vo_10": {
            category: "Surface",
            subCategory: "Forcing",
            variable: "Surface Relative Vorticity",
            shortname: "Surface Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity at the surface refers to the rotation of the wind field at 10m. It is used to analyze low-level atmospheric rotation. It is generally used to help indentify fronts or triple points.',
        },
        "vo_500": {
            category: "Upper Air",
            subCategory: "Vorticity",
            variable: "500mb Relative Vorticity",
            shortname: "500mb Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation.',
        },
        "vo_700": {
            category: "Upper Air",
            subCategory: "Vorticity",
            variable: "700mb Relative Vorticity",
            shortname: "700mb Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation.',
        },
        "vo_850": {
            category: "Upper Air",
            subCategory: "Vorticity",
            variable: "850mb Relative Vorticity",
            shortname: "850mb Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation.',
        },
        "w_500": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "500mb Vertical Velocity",
            shortname: "500mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "w_700": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "700mb Vertical Velocity",
            shortname: "700mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "w_850": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "850mb Vertical Velocity",
            shortname: "850mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "w_925": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "925mb Vertical Velocity",
            shortname: "925mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "wind_speed_10": {
            category: "Surface",
            subCategory: "Wind",
            variable: "10m Wind Speed",
            shortname: "10m Wind",
            units: {
                "mph": {
                    min: 0,
                    max: 200,
                    intervals: [5],
                },
                "kts": {
                    min: 0,
                    max: 150,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [2],
                },
                "km/h": {
                    min: 0,
                    max: 300,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_2000": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "Dynamic Tropopause Wind Speed",
            shortname: "2PVU Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: 'Dynamic Tropopause Wind Speed is the wind speed along the 2PVU surface. It is used to analyze jet stream and large-scale circulation patterns.',
        },
        "wind_speed_200": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "200mb Wind Speed",
            shortname: "200mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_250": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "250mb Wind Speed",
            shortname: "250mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_300": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "300mb Wind Speed",
            shortname: "300mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_500": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "500mb Wind Speed",
            shortname: "500mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_700": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "700mb Wind Speed",
            shortname: "700mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_850": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "850mb Wind Speed",
            shortname: "850mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_925": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "925mb Wind Speed",
            shortname: "925mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "height_pbl": {
            category: "Surface",
            subCategory: "Thermodynamics",
            variable: "Planetary Boundary Layer Height",
            shortname: "PBL Height",
            units: {
                 "m": {
                    min: 100,
                    max: 9000,
                    intervals: [100],
                },
                "ft": {
                    min: 500,
                    max: 30000,
                    intervals: [500],
                },
            },
            defaultUnit: 'm',
            description: 'Planetary Boundary Layer Height (PBL) is the height in which the planetary boundary is located, owing to surface inversions or frontal passages',
        },
        "slr": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "Snow Liquid Ratio",
            shortname: "SLR",
            units: {
                "in. Snow/in. Liquid": {
                    min: 1,
                    max: 50,
                    intervals: [1],
                },
            },
            
            description: 'Snow Liquid Ratio refers to how many inches of snow there would be if 1" of liquid fell. this paramater is used by calculating the ratio between the model ASNOW paramater and QPF 10:1 snowfall.',
        },

        "MergedReflectivityQCComposite_00.50": {
            category: "Composite Reflectivity",
            variable: "Merged Reflectivity",
            shortname: "REFC",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "CREF_1HR_MAX_00.50": {
            category: "Composite Reflectivity",
            variable: "1-Hour Max Composite Reflectivity",
            shortname: "1hr Max REFC",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MergedZdr_04.00": {
            category: "Dual-Polarization",
            variable: "Differential Reflectivity",
            shortname: "ZDR",
            units: {
                "dB": {
                    min: -4,
                    max: 20,
                    intervals: [0.5],
                },
            },
            
            description: '',
        },
        "MergedRhoHV_04.00": {
            category: "Dual-Polarization",
            variable: "Correlation Coefficient",
            shortname: "CC",
            units: {
                "None": {
                    min: 0.2,
                    max: 3,
                    intervals: [0.1],
                },
            },
            
            description: '',
        },
        "MergedAzShear_0-2kmAGL_00.50": {
            category: "Rotation",
            variable: "Rotation Track (Instant)",
            shortname: "Low-level Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "MergedAzShear_3-6kmAGL_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (Instant)",
            shortname: "Mid-level Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML30min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (30 min)",
            shortname: "30Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML60min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (60 min)",
            shortname: "60Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML120min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (120 min)",
            shortname: "120Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML240min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (240 min)",
            shortname: "240Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML360min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (360 min)",
            shortname: "360Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML1440min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (1440 min)",
            shortname: "1440Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack30min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (30 min)",
            shortname: "30Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack60min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (60 min)",
            shortname: "60Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack120min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (120 min)",
            shortname: "120Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack240min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (240 min)",
            shortname: "240Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack360min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (360 min)",
            shortname: "360Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack1440min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (1440 min)",
            shortname: "1440Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "ptypeRefl": {
            category: "Composite Reflectivity",
            variable: "Precipitation Type Reflectivity",
            shortname: "Precip. Type Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 280,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "MESH_Max_30min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (30 min)",
            shortname: "Max Hail Size (30 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "MESH_Max_60min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (60 min)",
            shortname: "Max Hail Size (60 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "MESH_Max_120min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (120 min)",
            shortname: "Max Hail Size (120 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "MESH_Max_240min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (240 min)",
            shortname: "Max Hail Size (240 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "MESH_Max_360min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (360 min)",
            shortname: "Max Hail Size (360 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "MESH_Max_1440min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (1440 min)",
            shortname: "Max Hail Size (1440 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "MESH_00.50": {
            category: "Hail",
            variable: "Max Hail Size",
            shortname: "Max Hail Size",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
                "in": {
                    min: 0.01,
                    max: 10,
                    intervals: [5],
                },
            },
            defaultUnit: 'mm',
            description: '',
        },
        "FLASH_QPE_ARIMAX_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (Max)",
            shortname: "FF ARI (Max)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI30M_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (30 Min)",
            shortname: "FF ARI (30 Min)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI01H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (1hr)",
            shortname: "FF ARI (1hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI03H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (3hr)",
            shortname: "FF ARI (3hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI06H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (6hr)",
            shortname: "FF ARI (6hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI12H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (12hr)",
            shortname: "FF ARI (12hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI24H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (24hr)",
            shortname: "FF ARI (24hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "LightningProbabilityNext30minGrid_scale_1": {
            category: "Lightning",
            variable: "Lightning Probability (30 Min)",
            shortname: "Lightning Prob (30 Min)",
            units: {
                "%": {
                    min: 5,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "LightningProbabilityNext60minGrid_scale_1": {
            category: "Lightning",
            variable: "Lightning Probability (60 Min)",
            shortname: "Lightning Prob (60 Min)",
            units: {
                "%": {
                    min: 5,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "VIL_Max_1440min_00.50": {
            category: "Vertically Integrated Liquid",
            variable: "Max Vertically Integrated Liquid (1440 Min)",
            shortname: "Max VIL (1440 Min)",
            units: {
                "kg/m²": {
                    min: 0.1,
                    max: 100,
                    intervals: [2],
                },
            },
            
            description: '',
        },
        "VIL_Max_120min_00.50": {
            category: "Vertically Integrated Liquid",
            variable: "Max Vertically Integrated Liquid (120 Min)",
            shortname: "Max VIL (120 Min)",
            units: {
                "kg/m²": {
                    min: 0.1,
                    max: 100,
                    intervals: [2],
                },
            },
            
            description: '',
        },
        "VIL_00.50": {
            category: "Vertically Integrated Liquid",
            variable: "Vertically Integrated Liquid",
            shortname: "VIL",
            units: {
                "kg/m²": {
                    min: 0.1,
                    max: 100,
                    intervals: [2],
                },
            },
            
            description: '',
        },
    },
    smoothing: {
        'hires': {
            'tadv_300': 2,
            'tadv_700': 2,
            'tadv_850': 2,
            'w_500': 2,
            'w_700': 2,
            'w_850': 2,
            'w_925': 2,
            'vo_500': 4,
            'vo_700': 4,
            'vo_850': 4,
            'vo_10': 4,
            'fgen_700': 7,
            'fgen_850': 7,
            'divergence_200': 7,
            'divergence_850': 7,
        },
        'medres': {
            'tadv_300': 3,
            'divergence_200': 7,
            'divergence_850': 7,
        },
        'lowres': {
            'tadv_300': 3,
            'divergence_200': 7,
            'divergence_850': 7,
        },
    },
    model_type: {
        'arome1': 'hires',
        'arome25': 'hires',
        'arpegeeu': 'hires',
        'arw': 'hires',
        'arw2': 'hires',
        'fv3': 'hires',
        'hrdps': 'hires',
        'href': 'hires',
        'hrrr': 'hires',
        'hrrrsub':'hires',
        'icond2': 'hires',
        'iconeu': 'hires',
        'mpashn': 'hires',
        'mpasht': 'hires',
        'mpasrt': 'hires',
        'mpasrn': 'hires',
        'mpasrn3': 'hires',
        'mpasht2': 'hires',
        'namnest': 'hires',
        'nbm': 'hires',
        'rrfs': 'hires',
        'hwrf': 'hires',
        'hmon': 'hires',
        'hfsb': 'hires',
        'hfsa': 'hires',

        'ecmwf': 'lowres',
        'ecmwfaifs': 'lowres',
        'gefs': 'lowres',
        'gem': 'lowres',
        'gfs': 'lowres',
        'graphcastgfs': 'lowres',
        'arpege': 'lowres',

        'nam': 'medres',
        'rap': 'medres',
        'rgem': 'medres',
        
        'rtma': 'hires', 
        'mrms': 'hires',
    },
    variable_cmap: {
        //mrms
        'MergedReflectivityQCComposite_00.50': 'refc_0',
        'CREF_1HR_MAX_00.50': 'refc_0',

        "RotationTrackML60min_00.50": 'rotation',
        "RotationTrackML360min_00.50": 'rotation',
        "RotationTrackML30min_00.50": 'rotation',
        "RotationTrackML240min_00.50": 'rotation',
        "RotationTrackML1440min_00.50": 'rotation',
        "RotationTrackML120min_00.50": 'rotation',
        "RotationTrack60min_00.50": 'rotation',
        "RotationTrack360min_00.50": 'rotation',
        "RotationTrack30min_00.50": 'rotation',
        "RotationTrack240min_00.50": 'rotation',
        "RotationTrack1440min_00.50": 'rotation',
        "RotationTrack120min_00.50": 'rotation',
        "MergedAzShear_0-2kmAGL_00.50": 'rotation',
        "MergedAzShear_3-6kmAGL_00.50": 'rotation',

        "MESH_Max_60min_00.50": 'hail',
        "MESH_Max_360min_00.50": 'hail',
        "MESH_Max_30min_00.50": 'hail',
        "MESH_Max_240min_00.50": 'hail',
        "MESH_Max_1440min_00.50": 'hail',
        "MESH_Max_120min_00.50": 'hail',
        "MESH_00.50": 'hail',

        "FLASH_QPE_ARIMAX_00.00": 'ff_ari',
        "FLASH_QPE_ARI30M_00.00": 'ff_ari',
        "FLASH_QPE_ARI24H_00.00": 'ff_ari',
        "FLASH_QPE_ARI12H_00.00": 'ff_ari',
        "FLASH_QPE_ARI06H_00.00": 'ff_ari',
        "FLASH_QPE_ARI03H_00.00": 'ff_ari',
        "FLASH_QPE_ARI01H_00.00": 'ff_ari',

        "LightningProbabilityNext60minGrid_scale_1": 'lightning_prob',
        "LightningProbabilityNext30minGrid_scale_1": 'lightning_prob',

        "VIL_Max_1440min_00.50": 'vil',
        "VIL_Max_120min_00.50": 'vil',
        "VIL_Density_00.50": 'vil',
        "VIL_00.50": 'vil',
        "LVL3_HighResVIL_00.50": 'vil',

        // "PrecipFlag_00.00": 'ptype'

        //model
        'wind_speed_200': "wind_speed_upper",
        'wind_speed_250': "wind_speed_upper",
        'wind_speed_300': "wind_speed_upper",
        'wind_speed_2pvu': "wind_speed_upper",
        'wind_speed_2000': "wind_speed_upper",

        'wind_speed_500': "wind_speed_mid",
        'wind_speed_700': "wind_speed_mid",
        'wind_speed_850': "wind_speed_mid",
        'wind_speed_925': "wind_speed_mid",

        'bulk_shear_speedmb_500': "bulk_shear_speed_upper",
        'bulk_shear_speedmb_700': "bulk_shear_speed_upper",
        'bulk_shear_speed_0-6000': "bulk_shear_speed_upper",
        'bulk_shear_speedmb_850': "bulk_shear_speed_lower",
        'bulk_shear_speedmb_925': "bulk_shear_speed_lower",
        'bulk_shear_speed_0-1000': "bulk_shear_speed_lower",
        
        "cape_9000": "cape_0",
        "cape_25500": "cape_0",

        "cin_9000": "cin_0",
        "cin_25500": "cin_0",

        'tadv_300': "tadv",
        'tadv_700': "tadv",
        'tadv_850': "tadv",

        'r_500': "r",
        'r_700': "r",
        'r_850': "r",
        'r_925': "r",

        'w_500': "w",
        'w_700': "w",
        'w_850': "w",
        'w_925': "w",

        't_500': "t",
        't_700': "t",
        't_850': "t",
        't_925': "t",

        'refc_500': 'refc_0',
        'refd_1000': 'refc_0',
        'mxrefc_1000': 'refc_0',

        'd_700': "d",
        'd_850': "d",
        'd_925': "d",

        'vo_500': "vo",
        'vo_700': "vo",
        'vo_850': "vo",
        'vo_10': "vo",

        'hlcy_3000': "hlcy",
        'hlcy_1000': "hlcy",
        'uphl_5000': "mxuphl_5000",

        'ehi_3000': "ehi",
        'ehi_1000': "ehi",

        'mxuphl_5000_runmax': "mxuphl_5000",
        'mxuphl_3000_runmax': "mxuphl_3000",

        'gust_runmax': "gust_0",

        'height_pbl': "cape_0",

        'lftx_500': "lftx_0",

        'ltng_0': 'ltng',
        'ltng_2': 'ltng',

        'divergence_850': "divergence",
        'divergence_200': "divergence",

        'fgen_850': "fgen",
        'fgen_700': "fgen",

        'avg_prate_6hr': "prate",
        'avg_prate_3hr': "prate",

        'csnow_3': 'csnow_total',
        'csnow_6': 'csnow_total',
        'csnow_12': 'csnow_total',
        'csnow_24': 'csnow_total',
        'csnow_48': 'csnow_total',
        'csnow_total': 'csnow_total',
        'cfrzr_3': 'cfrzr_total',
        'cfrzr_6': 'cfrzr_total',
        'cfrzr_12': 'cfrzr_total',
        'cfrzr_24': 'cfrzr_total',
        'cfrzr_48': 'cfrzr_total',
        'cfrzr_total': 'cfrzr_total',
        'crain_3': 'crain_total',
        'crain_6': 'crain_total',
        'crain_12': 'crain_total',
        'crain_24': 'crain_total',
        'crain_48': 'crain_total',
        'crain_total': 'crain_total',
        'cicep_3': 'cicep_total',
        'cicep_6': 'cicep_total',
        'cicep_12': 'cicep_total',
        'cicep_24': 'cicep_total',
        'cicep_48': 'cicep_total',
        'cicep_total': 'cicep_total',
        'tp_3': 'tp_0_total',
        'tp_6': 'tp_0_total',
        'tp_12': 'tp_0_total',
        'tp_24': 'tp_0_total',
        'tp_48': 'tp_0_total',

        "gh_tendency_500": 'gh_tendency',

        'atemp': '2t_2',
        't_500iso0': 't_iso',
        't_700iso0': 't_iso',
        't_850iso0': 't_iso',
        't_925iso0': 't_iso',
        '2t_2iso0': 't_iso',
    },
}
