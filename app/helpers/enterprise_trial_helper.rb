module EnterpriseTrialHelper
  def augur_content_security_policy
    append_content_security_policy_directives(
      connect_src: %w(augur.openproject-edge.com)
    )
  end

  def chargebee_content_security_policy
    append_content_security_policy_directives(
      script_src: %w(js.chargebee.com),
      style_src: %w(js.chargebee.com openproject-enterprise-test.chargebee.com),
      frame_src: %w(js.chargebee.com openproject-enterprise-test.chargebee.com)
    )
  end
end