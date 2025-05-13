# -*- coding: utf-8 -*-
from odoo import api, models,fields
import requests
import json

class CrmEtimadTag(models.Model):
    _name = "crm.etimad.tag.client"
    _description = "crm_etimad_tag"
    name = fields.Char("Name", required=True)

class CrmForsahTag(models.Model):
    _name = "crm.forsah.tag.client"
    _description = "crm_forsah_tag"
    name = fields.Char("Name", required=True)
