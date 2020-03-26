// -- copyright
// OpenProject is an open source project management software.
// Copyright (C) 2012-2020 the OpenProject GmbH
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See docs/COPYRIGHT.rdoc for more details.
// ++

import {Component, ElementRef} from "@angular/core";
import {FormBuilder, Validators} from "@angular/forms";
import {I18nService} from "app/modules/common/i18n/i18n.service";
import {EnterpriseTrialService} from "core-components/enterprise/enterprise-trial.service";

@Component({
  selector: 'enterprise-trial-form',
  templateUrl: './ee-trial-form.component.html',
  styleUrls: ['./ee-trial-form.component.sass']
})
export class EETrialFormComponent {
  // enterprise trial form
  trialForm = this.formBuilder.group({
    company: ['', Validators.required],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    domain: ['', Validators.required],
    general_consent: [null, Validators.required],
    newsletter_consent: null,
  });

  public text = {
    label_test_ee: this.I18n.t('js.admin.enterprise.trial.test_ee'),
    label_company: this.I18n.t('js.admin.enterprise.trial.label_company'),
    label_first_name: this.I18n.t('js.admin.enterprise.trial.label_first_name'),
    label_last_name: this.I18n.t('js.admin.enterprise.trial.label_last_name'),
    label_email: this.I18n.t('js.admin.enterprise.trial.label_email'),
    label_domain: this.I18n.t('js.admin.enterprise.trial.label_domain'),
    next_step: this.I18n.t('js.admin.enterprise.trial.next_step'),
    privacy_policy: this.I18n.t('js.admin.enterprise.trial.privacy_policy'),
    terms_of_service: this.I18n.t('js.admin.enterprise.trial.terms_of_service')
  };

  constructor(readonly elementRef:ElementRef,
              readonly I18n:I18nService,
              private formBuilder:FormBuilder,
              public eeTrialService:EnterpriseTrialService) {

  }

  // checks if mail is valid after input field was edited by the user
  // displays message for user
  public checkMailField() {
    if (this.trialForm.value.email !== '' && this.trialForm.controls.email.errors) {
      this.eeTrialService.errorMsg = 'Invalid e-mail address';
    } else {
      this.eeTrialService.errorMsg = undefined;
    }
  }
}

