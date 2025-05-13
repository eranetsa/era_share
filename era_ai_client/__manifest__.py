# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'ERA Artificial Intelligence Client Module',
    'summary': 'Artificial Intelligence Integration Client',
    'version': '1.0',
    'author': 'ERA Groups',
    'website': 'https://era.net.sa/',
    'depends': ['base', 'web', 'web_tour'],
    'data': [
        'security/ir.model.access.csv',
        'views/tour_connector.xml',
        # 'views/sql_connector.xml',
        'views/res_config_settings_view.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'era_ai_client/static/src/js/execute_tour.js',

            'era_ai_client/static/src/js/tour_dialog/ai_bot_button.js',
            'era_ai_client/static/src/xml/tour_dialog/ai_bot_button.xml',

            'era_ai_client/static/src/js/tour_dialog/tour_ai_dialog.js',
            'era_ai_client/static/src/xml/tour_dialog/tour_ai_dialog.xml',

            'era_ai_client/static/src/xml/tour_dialog/sql_ai_dialog.xml',
            'era_ai_client/static/src/js/tour_dialog/sql_ai_dialog.js',

       
            'web/static/lib/select2/select2.js',
            'web/static/lib/select2/select2.css',
     
         
        ],
       
        
    },
    'images': ["static/description/icon.png"],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
