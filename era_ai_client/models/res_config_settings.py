# -*- coding: utf-8 -*-
# Copyright (C) 2022 - Michel Perrocheau (https://github.com/myrrkel).
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).

from odoo import api, fields, models, _
import logging

_logger = logging.getLogger(__name__)


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'


    openai_api_key = fields.Char(related="company_id.openai_api_key", string="OpenAI API Key", readonly=False)
    max_tokens = fields.Integer(related="company_id.max_tokens", help='''An upper bound for the number of tokens that can be generated 
                                            for a completion, including visible output tokens and reasoning tokens.
                                        ''', readonly=False)