(async () => {
  const params = new URLSearchParams({
    pageSize: '1',
    orderBy: 'ORDER_BY_LAST_USE_TIME',
    source: 'SOURCE_ANY',
    isLatest: 'true',
    includeImagineFiles: 'true',
  });

  const response = await fetch(`/rest/assets?${params.toString()}`, { credentials: 'include' });
  const data = await response.json();
  const asset = (data.assets || data.items || [])[0];
  console.log('[first asset]', asset);
  console.log(JSON.stringify(asset, null, 2));
  return asset;
})();
