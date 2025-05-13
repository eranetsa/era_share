# -*- coding: utf-8 -*-
{
    'name': "Era Crm Forsah & Etimad For Clients",
    "version" : "17.0.0.1",
    "category" : "CRM",
    'description': """
       Era Crm Forsah & Etimad For Clients
    """,
    'author': "Era group",
    'email': "",
    'website': "https://era.net.sa/",
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

