# -*- coding: utf-8 -*-
{
    'name': "Era Crm Forsah & Etimad For Clients",
    "version" : "18.0.0.0",
    "category" : "CRM",
    'description': """
       Era Crm Forsah & Etimad For Clients 
    """,
    "author": "Era group",
    "email": "aqlan@era.net.sa",
    "website": "https://era.net.sa",
    'license': 'AGPL-3',
    'depends': ['base','contacts', 'crm'],
    'data': [
        'data/cronjob.xml',
        'security/ir.model.access.csv',
        'views/crm_forsah_view.xml',
        'views/crm_etimad_view.xml',
    ],
    'installable': True,
    'application': True,
}

