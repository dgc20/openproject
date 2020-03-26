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

import {ChangeDetectorRef, Component, ElementRef, Inject, Input} from "@angular/core";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {OpModalComponent} from "app/components/op-modals/op-modal.component";
import {OpModalLocalsToken} from "app/components/op-modals/op-modal.service";
import {OpModalLocalsMap} from "app/components/op-modals/op-modal.types";
import {I18nService} from "app/modules/common/i18n/i18n.service";
import {HalResourceNotificationService} from "core-app/modules/hal/services/hal-resource-notification.service";
import {enterpriseEditionUrl} from "core-app/globals/constants.const";
import {PathHelperService} from "core-app/modules/common/path-helper/path-helper.service";
import {NotificationsService} from "core-app/modules/common/notifications/notifications.service";

export interface EnterpriseTrialOptions {
  text:{
    title:string;
    text:string;
    button_continue?:string;
    button_cancel?:string;
  };
  closeByEscape?:boolean;
  showClose?:boolean;
  closeByDocument?:boolean;
}

@Component({
  templateUrl: './enterprise-trial.modal.html',
  styleUrls: ['./enterprise-trial.modal.sass']
})
export class EnterpriseTrialModal extends OpModalComponent {
  @Input() public opReferrer:string;

  // enterprise form
  enterpriseTrialForm = this.formBuilder.group({
    company: ['', Validators.required],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    domain: ['', Validators.required],
    general_consent: [null, Validators.required],
    newsletter_consent: null,
  });

  public baseUrlAugur = 'https://augur.openproject-edge.com';
  public trialLink:string;
  public resendLink:string;

  public showClose:boolean;
  public confirmed = false;
  public cancelled = false;
  public status:string;
  public errorMsg:string|undefined;

  private options:EnterpriseTrialOptions;

  public text = {
    button_submit: this.I18n.t('js.modals.button_submit'),
    button_cancel: this.I18n.t('js.modals.button_cancel'),
    button_continue: this.I18n.t('js.button_continue'),
    close_popup: this.I18n.t('js.close_popup_title'),
    label_test_ee: this.I18n.t('js.admin.enterprise.trial.test_ee'),
    label_company: this.I18n.t('js.admin.enterprise.trial.label_company'),
    label_first_name: this.I18n.t('js.admin.enterprise.trial.label_first_name'),
    label_last_name: this.I18n.t('js.admin.enterprise.trial.label_last_name'),
    label_email: this.I18n.t('js.admin.enterprise.trial.label_email'),
    label_domain: this.I18n.t('js.admin.enterprise.trial.label_domain'),
    next_step: this.I18n.t('js.admin.enterprise.trial.next_step'),
    resend: this.I18n.t('js.admin.enterprise.trial.resend_link'),
    title: this.I18n.t('js.modals.form_submit.title'),
    text: this.I18n.t('js.modals.form_submit.text'),
  };

  constructor(readonly elementRef:ElementRef,
              @Inject(OpModalLocalsToken) public locals:OpModalLocalsMap,
              readonly cdRef:ChangeDetectorRef,
              readonly I18n:I18nService,
              protected http:HttpClient,
              readonly pathHelper:PathHelperService,
              protected notificationsService:NotificationsService,
              private formBuilder:FormBuilder) {
    super(locals, cdRef, elementRef);

    // modal configuration
    this.options = locals.options || {};
    this.closeOnEscape = _.defaultTo(this.options.closeByEscape, true);
    this.closeOnOutsideClick = _.defaultTo(this.options.closeByDocument, true);
    this.showClose = _.defaultTo(this.options.showClose, true);

    // override default texts if any
    this.text = _.defaults(this.options.text, this.text);
  }

  // checks if form is valid and submits it
  public onSubmit() {
    if (this.enterpriseTrialForm.valid) {
      this.enterpriseTrialForm.addControl('_type', new FormControl('enterprise-trial'));

      this.sendForm(this.enterpriseTrialForm.value);
    }
  }

  // sends POST request with form object
  // receives an enterprise trial link to access a token
  private sendForm(form:FormGroup) {
    const delay = 5000; // wait 5s until next request
    const retries = 60; // keep trying for 5 minutes
    const trialPath = 'https://augur.openproject-edge.com/public/v1/trials';

    // POST /public/v1/trials/
    this.http.post(trialPath, form)
      .toPromise()
      .then((enterpriseTrial:any) => {
        this.trialLink = enterpriseTrial._links.self.href;

        this.retryConfirmation(delay, retries);
      })
      .catch((error:HttpErrorResponse) => {
        // mail is invalid or user already created a trial
        if (error.status === 422 || error.status === 400) {
          this.errorMsg = error.error.description;
        } else {
          // 500 -> internal error occured
          this.notificationsService.addWarning(error.error.description || I18n.t('js.error.internal'));
        }
      });
  }

  // gets a token from the trial link if user confirmed mail
  private getToken() {
    // 2) GET /public/v1/trials/:id
    this.http
      .get<any>(this.baseUrlAugur + this.trialLink)
      .toPromise()
      .then((res:any) => {
        // show confirmed status and enable continue btn
        this.confirmed = true;
        // returns token if mail was confirmed -> save token in backend
        this.saveToken(res.token);
      })
      .catch((error:HttpErrorResponse) => {
        // returns error 422 while waiting of confirmation
        if (error.status === 422 && error.error.identifier === 'waiting_for_email_verification') {
          // open next modal window -> status waiting
          this.status = 'mailSubmitted';
          // get resend button link
          this.resendLink = error.error._links.resend.href;
        } else if (_.get(error, 'error._type') === 'Error') {
          this.notificationsService.addWarning(error.error.message);
        } else {
          // backend returned an unsuccessful response code
          this.notificationsService.addWarning(error.error);
        }
      });
  }

  // saves received token in controller
  private saveToken(token:string) {
    // POST /admin/enterprise (params[:enterprise_token][:encoded_token])
    // -> if token is new (token_retrieved: false) save token in ruby controller
    this.http.post(this.pathHelper.api.v3.appBasePath + '/admin/enterprise', { enterprise_token: { encoded_token: token } }, { withCredentials: true })
      .toPromise()
      .then((res:any) => {
        console.log('saveToken() success: ', res);
      })
      .catch((error:HttpErrorResponse) => {
        console.log('saveToken() failed: ', error.error);
        this.notificationsService.addWarning(error.error.description || I18n.t('js.error.internal'));
      });
  }

  // retries request while waiting for mail confirmation
  private retryConfirmation(delay:number, retries:number) {
    if (this.cancelled || this.confirmed) {
      // stop if action was cancelled or confirmation link was clicked
      return;
    } else if (retries === 0) {
      // action timed out -> show message
      this.cancelled = true;
    } else {
      // retry as long as limit isn't reached
      this.getToken();
      setTimeout( () => {
        this.retryConfirmation(delay, retries - 1);
      }, delay);
    }
  }

  // TODO: add enterprise onboarding youtube video
  public startEnterpriseTrial() {
    // open onboarding modal
    this.status = 'startTrial';
  }

  // resends mail if resend link has been clicked
  public resendMail() {
    this.http.post(this.baseUrlAugur + this.resendLink, {})
      .toPromise()
      .then((enterpriseTrial:any) => {
        console.log('Mail has been resent.');
        this.notificationsService.addSuccess('Mail has been resent. Please check your mails and click the confirmation link provided.');

        this.cancelled = false;
        this.retryConfirmation(5000, 6);
      })
      .catch((error:HttpErrorResponse) => {
        console.log('An Error occured: ', error);
        this.notificationsService.addWarning('Could not resend mail.');
      });
  }

  // checks if mail is valid after input field was edited by the user
  // displays message for user
  public checkMailField() {
    if (this.enterpriseTrialForm.value.email !== '' && this.enterpriseTrialForm.controls.email.errors) {
      this.errorMsg = 'Invalid e-mail address';
    } else {
      this.errorMsg = undefined;
    }
  }

  public closeModal(event:any) {
    // cancel all actions (e.g. an already send request)
    this.cancelled = true;
    this.closeMe(event);
    // refresh page to show enterprise trial
    if (this.status === 'startTrial' || this.confirmed) {
      window.location.reload();
    }
  }
}

