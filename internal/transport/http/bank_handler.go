package httpapi

import (
	"net/http"
	"regexp"

	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/pkg"
)

// Nigerian banks (Paystack codes) — the payout-destination list shown in the
// tutor bank-details form. Curated major banks; the full list is available
// from Paystack when a secret is configured.
var nigerianBanks = []struct {
	Name string `json:"name"`
	Code string `json:"code"`
}{
	{"Access Bank", "044"},
	{"Access Bank (Diamond)", "063"},
	{"Citibank Nigeria", "023"},
	{"Ecobank Nigeria", "050"},
	{"Fidelity Bank", "070"},
	{"First Bank of Nigeria", "011"},
	{"First City Monument Bank", "214"},
	{"Globus Bank", "00103"},
	{"Guaranty Trust Bank", "058"},
	{"Heritage Bank", "030"},
	{"Jaiz Bank", "301"},
	{"Keystone Bank", "082"},
	{"Kuda Bank", "50211"},
	{"Moniepoint MFB", "50515"},
	{"Opay", "999992"},
	{"Optimus Bank", "00107"},
	{"PalmPay", "999991"},
	{"Parallex Bank", "104"},
	{"Polaris Bank", "076"},
	{"Premium Trust Bank", "105"},
	{"Providus Bank", "101"},
	{"Stanbic IBTC Bank", "221"},
	{"Standard Chartered Bank", "068"},
	{"Sterling Bank", "232"},
	{"Suntrust Bank", "100"},
	{"Titan Trust Bank", "102"},
	{"Union Bank of Nigeria", "032"},
	{"United Bank for Africa", "033"},
	{"Unity Bank", "215"},
	{"Wema Bank", "035"},
	{"Zenith Bank", "057"},
}

// BankHandler — GET /tutors/banks (list) + POST /tutors/banks/resolve
// (account-name resolution via Paystack).
type BankHandler struct {
	resolver *payment_provider.BankResolver
}

func NewBankHandler(resolver *payment_provider.BankResolver) *BankHandler {
	return &BankHandler{resolver: resolver}
}

func (h *BankHandler) List(w http.ResponseWriter, r *http.Request) {
	requireActor(w, r)
	pkg.WriteSuccess(w, http.StatusOK, nigerianBanks, nil)
}

var accountNumberRE = regexp.MustCompile(`^\d{10}$`)

func (h *BankHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		AccountNumber string `json:"account_number"`
		BankCode      string `json:"bank_code"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if !accountNumberRE.MatchString(req.AccountNumber) || req.BankCode == "" {
		WriteAppError(w, pkg.BadRequest("a 10-digit account number and bank code are required", nil))
		return
	}
	if !h.resolver.Enabled() {
		pkg.WriteError(w, http.StatusConflict, string(pkg.CodeConflict),
			"account-name resolution is not configured (set PAYSTACK_SECRET)", nil)
		return
	}
	name, err := h.resolver.ResolveAccountName(req.AccountNumber, req.BankCode)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("could not resolve the account: "+err.Error(), nil))
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"account_name": name}, nil)
}
