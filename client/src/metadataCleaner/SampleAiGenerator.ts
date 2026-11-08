export function createSampleAiJpeg(): File {
  const xmpXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 2024/01/01-00:00:00">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">
   <Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>
   <xmp:CreatorTool>Google (Gemini / Imagen)</xmp:CreatorTool>
   <xmp:CreateDate>2026-10-21T03:09:27Z</xmp:CreateDate>
   <photoshop:Credit>Google Imagen 3</photoshop:Credit>
   <photoshop:Source>AI Generated via Gemini</photoshop:Source>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Created with Google Gemini / Imagen 3. Prompt: Editing photo with football jersey</rdf:li>
    </rdf:Alt>
   </dc:description>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpHeader = 'http://ns.adobe.com/xap/1.0/\0';
  const xmpPayload = new TextEncoder().encode(xmpHeader + xmpXml);
  const app1Length = xmpPayload.length + 2;

  // APP11 segment (C2PA JUMBF box)
  const c2paHeader = 'JUMB\0c2pa.manifest\0';
  const c2paPayload = new TextEncoder().encode(
    c2paHeader + 'Content Credentials Manifest Data Google LLC Google C2PA Media Services pki.goog'
  );
  const app11Length = c2paPayload.length + 2;

  const baseJpegHead = [
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
  ];

  const app1Segment = [
    0xff,
    0xe1,
    (app1Length >> 8) & 0xff,
    app1Length & 0xff,
    ...Array.from(xmpPayload),
  ];

  const app11Segment = [
    0xff,
    0xeb,
    (app11Length >> 8) & 0xff,
    app11Length & 0xff,
    ...Array.from(c2paPayload),
  ];

  const baseJpegTail = [
    0xff, 0xdb, 0x00, 0x43, 0x00,
    ...new Array(64).fill(0x10),
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x08, 0x00, 0x08, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0xf5, 0xaa, 0x55, 0xaa, 0x55, 0x00,
    0xff, 0xd9,
  ];

  const fullBytes = new Uint8Array([
    ...baseJpegHead,
    ...app1Segment,
    ...app11Segment,
    ...baseJpegTail,
  ]);

  return new File([fullBytes], 'Editing_photo_with_football_jersey_2K_20261021030927.jpg', {
    type: 'image/jpeg',
  });
}
