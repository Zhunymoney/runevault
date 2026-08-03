import assert from "node:assert/strict";
import test from "node:test";
import { emailTemplate, escapeHtml } from "../lib/email-templates.ts";

test("customer and admin events map to branded HTML and plain text",()=>{
  for(const name of ["welcome","order_confirmation","payment_instructions","crypto_submitted","card_confirmed","delivery_started","order_completed","order_cancelled","refund_issued","admin_new_order","admin_payment_confirmed","admin_high_risk"]){
    const result=emailTemplate(name,{reference:"RV-ABC123",summary:{Status:"Verified"}});
    assert.match(result.html,/RuneVault/);assert.match(result.text,/RuneVault|RV-ABC123/);assert.ok(result.subject.length>3);
  }
});

test("customer-controlled template content is escaped",()=>{
  const payload='<img src=x onerror="alert(1)">';
  const result=emailTemplate("order_confirmation",{recipientName:payload,summary:{Name:payload},detail:payload,actionUrl:"javascript:alert(1)"});
  assert.doesNotMatch(result.html,/<img|javascript:/);assert.match(result.html,/&lt;img/);assert.equal(escapeHtml(payload).includes("&lt;img"),true);
});
