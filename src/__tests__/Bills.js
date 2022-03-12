/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";

import router from "../app/Router.js";
import userEvent from "@testing-library/user-event";
import Bills from "../containers/Bills.js";
import { formatDate, formatStatus } from "../app/format.js";
import wrongStore from "../__mocks__/wrongStore.js";
import mockStore from "../__mocks__/store.js";

jest.mock('../app/Store', () => require('../__mocks__/store.js').default);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))
    test("Then bill icon in vertical layout should be highlighted", async () => {

      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.toString()).toEqual('active-icon');

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })
  describe("When I click on eye icon", () => {
    test("then, it open a modal with the bill's proof", async () => {

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      document.body.innerHTML = '';

      const BILLS = new Bills({document: document, onNavigate: onNavigate, store: mockStore, localStorage: window.localStorage});

      mockStore.bills().list().then(async snapshot => {
        const attendedBills = snapshot
          .map(doc => {
            try {
              return {
                ...doc,
                date: formatDate(doc.date),
                status: formatStatus(doc.status),
              }
            } catch(e) {
              // if for some reason, corrupted data was introduced, we manage here failing formatDate function
              // log the error and return unformatted date in that case
              return {
                ...doc,
                date: doc.date,
                status: formatStatus(doc.status)
              }
            }
          })
        BILLS.getBills().then(result => {
          expect(result).toEqual(attendedBills);
        });
      })
      
      document.body.innerHTML = BillsUI({data: bills});

      const iconEye = screen.getAllByTestId('icon-eye')[0];
      expect(iconEye).toBeTruthy();


      const handleClickIconEye = jest.fn((e) => BILLS.handleClickIconEye(iconEye));
      iconEye.addEventListener('click', handleClickIconEye);
      userEvent.click(iconEye);
      expect(handleClickIconEye).toHaveBeenCalled();
      expect(screen.getByAltText('Bill')).toBeTruthy();


    })
    test('enter catch on getBills', () => {

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      const BILLS = new Bills({document: document, onNavigate: onNavigate, store: wrongStore, localStorage: window.localStorage});

      wrongStore.bills().list().then(async snapshot => {
        const attendedBills = snapshot
          .map(doc => {
            try {
              return {
                ...doc,
                date: formatDate(doc.date),
                status: formatStatus(doc.status),
              }
            } catch(e) {
              // if for some reason, corrupted data was introduced, we manage here failing formatDate function
              // log the error and return unformatted date in that case
              return {
                ...doc,
                date: doc.date,
                status: formatStatus(doc.status)
              }
            }
          })
        BILLS.getBills().then(result => {
          expect(result).toEqual(attendedBills);
        });
      })
    })
  })
  
  describe('When an error occurs on API', () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })
    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("fetches messages from an API and fails with 500 message error", async () => {

      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }})

      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})
