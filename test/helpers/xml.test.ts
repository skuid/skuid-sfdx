
import { expect } from "chai";
import { condenseXml, formatXml } from "../../src/helpers/xml";

const formula = `CASE(
	MONTH({{CreatedDate}}),
		1, "Snow",
		7, "Humidity",
		"Who knows"
)`;
const inlineJS = `//This should be preserved
const foo = "bar";
if (foo == "bar") {
		// Indentation in here should be preserved
		console.log("Hello: " + foo);
} else {
		console.log("Hola: " + foo);
}
console.log(foo);
`;
const getFormatted = (alternateIndent = "") => {
	let part1 = `<skuid__page>
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
					<formula>`;
	let part2 = `</formula>
				</field>
			</fields>
		</model>
	</models>
	<resources>
		<javascript>
			<jsitem location="inline" name="SomeInlineJS">`;
	let part3 = `</jsitem>
		</javascript>
	</resources>
</skuid__page>`;
	if (alternateIndent) {
		part1 = part1.replace(/\t/g, alternateIndent);
		part2 = part2.replace(/\t/g, alternateIndent);
		part3 = part3.replace(/\t/g, alternateIndent);
	}
	return part1 + formula + part2 + inlineJS + part3;
};
const condensed = `<skuid__page><models><model id="foo" sobject="Account"><fields><field id="Name"/><field id="CreatedDate"/></fields></model><model id="bar" sobject="Contact"><fields><field id="Name"/><field id="CreatedDate"/><field id="Forecast" uionly="true" displaytype="FORMULA" returntype="TEXT"><formula>${formula}</formula></field></fields></model></models><resources><javascript><jsitem location="inline" name="SomeInlineJS">${inlineJS}</jsitem></javascript></resources></skuid__page>`;

describe('condenseXml', () => {
  it("should remove recreateable whitespace from a string of XML", () => {
    expect(condenseXml(getFormatted())).to.equal(condensed);
  });
});

describe('formatXml', () => {
  it("should pretty print a string of condensed XML using tabs as indentation by default", () => {
		expect(formatXml(condensed).replace("\r\n", "\n")).to.equal(getFormatted());
	});
	it("should allow overrides of the indentation padding via environment variable", () => {
		// override indent to 2 spaces
		const alternateIndent = process.env.SKUID_XML_INDENT = "  ";
		expect(formatXml(condensed).replace("\r\n", "\n")).to.equal(getFormatted(alternateIndent));
		delete process.env.SKUID_XML_INDENT;
	});
});