
import { condenseXml, formatXml } from "../../src/helpers/xml";
import { expect } from '@salesforce/command/lib/test';

const formatted = `<skuid__page>
  <models>
    <model id="foo" sobject="Account">
      <fields>
        <field id="Name"/>
        <field id="CreatedDate"/>
      </fields>
    </model>
    <model id="bar" sobject="Contact">
      <fields>
        <field id="Name"/>
        <field id="CreatedDate"/>
        <field id="Forecast" uionly="true" displaytype="FORMULA" returntype="TEXT">
          <formula>CASE(
    MONTH({{CreatedDate}}),
                    1, "Snow",
                    7, "Humidity",
                    "Who knows"
        )</formula>
        </field>
      </fields>
    </model>
  </models>
  <resources>
    <javascript>
      <jsitem location="inline" name="SomeInlineJS">//This should be preserved
const foo = "bar";
if (foo == "bar") {
    // Indentation in here should be preserved
    console.log("Hello: " + foo);
} else {
    console.log("Hola: " + foo);
}
console.log(foo);
</jsitem>
    </javascript>
  </resources>
</skuid__page>`;
const condensed = `<skuid__page><models><model id="foo" sobject="Account"><fields><field id="Name"/><field id="CreatedDate"/></fields></model><model id="bar" sobject="Contact"><fields><field id="Name"/><field id="CreatedDate"/><field id="Forecast" uionly="true" displaytype="FORMULA" returntype="TEXT"><formula>CASE(
    MONTH({{CreatedDate}}),
                    1, "Snow",
                    7, "Humidity",
                    "Who knows"
        )</formula></field></fields></model></models><resources><javascript><jsitem location="inline" name="SomeInlineJS">//This should be preserved
const foo = "bar";
if (foo == "bar") {
    // Indentation in here should be preserved
    console.log("Hello: " + foo);
} else {
    console.log("Hola: " + foo);
}
console.log(foo);
</jsitem></javascript></resources></skuid__page>`;

describe('condenseXml', () => {
    it("should remove recreateable whitespace from a string of XML", () => {
        expect(condenseXml(formatted)).to.equal(condensed);
    });
});

describe('formatXml', () => {
    it("should pretty print a string of condensed XML using 2 spaces as indentation", () => {
        expect(formatXml(condensed).replace("\r\n", "\n")).to.equal(formatted);
    });
});