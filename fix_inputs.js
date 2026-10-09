const fs = require('fs');
const file = 'frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const phonePattern = 'pattern="^\\\\+?\\\\d{10,15}$" title="Phone number must contain 10-15 digits"';
const gstPattern = 'pattern="^[0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9a-zA-Z]{1}[zZ][0-9a-zA-Z]{1}$" title="Enter a valid 15-character GSTIN"';

content = content.replace(/<input type="text" className="form-control" value=\{customerForm.phone\}/g, `<input type="tel" ${phonePattern} className="form-control" value={customerForm.phone}`);
content = content.replace(/<input type="text" placeholder="15-digit GSTIN" value=\{formVendor.gstin\}/g, `<input type="text" ${gstPattern} placeholder="15-digit GSTIN" value={formVendor.gstin}`);
content = content.replace(/<input type="text" placeholder="10-digit mobile" value=\{formVendor.contact\}/g, `<input type="tel" ${phonePattern} placeholder="10-digit mobile" value={formVendor.contact}`);
content = content.replace(/<input type="text" placeholder="e.g. 9876543210" value=\{formStaff.phone\}/g, `<input type="tel" ${phonePattern} placeholder="e.g. 9876543210" value={formStaff.phone}`);
content = content.replace(/<input type="text" value=\{formSupplier.phone\}/g, `<input type="tel" ${phonePattern} value={formSupplier.phone}`);
content = content.replace(/<input type="text" value=\{formSupplier.gst_no\}/g, `<input type="text" ${gstPattern} value={formSupplier.gst_no}`);
content = content.replace(/<input type="text" placeholder="Phone" value=\{formPurchaseSupplierDetails.contact_phone\}/g, `<input type="tel" ${phonePattern} placeholder="Phone" value={formPurchaseSupplierDetails.contact_phone}`);

fs.writeFileSync(file, content);
console.log('App.jsx phone and GST inputs updated');
