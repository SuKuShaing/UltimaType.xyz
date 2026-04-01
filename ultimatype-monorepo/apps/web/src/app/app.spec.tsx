import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './app';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = renderWithProviders(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should display the UltimaType heading', () => {
    const { getAllByText } = renderWithProviders(<App />);
    expect(getAllByText('UltimaType').length).toBeGreaterThanOrEqual(1);
  });
});
