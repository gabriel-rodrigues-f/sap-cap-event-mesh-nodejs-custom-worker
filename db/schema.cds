using {
        cuid,
        managed
} from '@sap/cds/common';

namespace sample.poc;

entity Orders : cuid {
        CompanyCode : String(4);
        Supplier    : String(10);
        Currency    : String(3);
        NetAmount   : Decimal(13, 2);
        Status      : String(20);
}
