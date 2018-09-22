import React, { Component } from 'react';
import './App.css';
import './spectre.css';
import './spectre-icons.css';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const Box = styled.div`
	border: 1px solid black;
	border-radius: 5px;
	padding: 5px;
	flex-direction: row;
	display: flex;
	align-items: center;
	margin: 10px;
`;

const BoxLogo = styled.img`
	height: 96px;
	margin: 10px;
	flex-grow: 0;
`;

const BoxInfo = styled.div`
	flex-grow: 1;
`;

const BoxInfoMain = styled.p`
	font-weight: 800;
`;

const BoxInfoSub = styled.p`

`;

const BoxButtons = styled.div`

`;

const BoxButton = styled.div`

`;


class Item extends Component {
	render() {
		return (
			<Box>
				<BoxLogo src={this.props.img} />
				<BoxInfo>
					<BoxInfoMain>{this.props.name}</BoxInfoMain>{/* ({this.props.itemId}) */}
					<BoxInfoSub>{this.props.package} – {this.props.price} – {this.props.priceNorm}</BoxInfoSub>
				</BoxInfo>
				<BoxButtons>
					<BoxButton className="btn btn-action circle" style={{margin: '10px'}} onClick={() => this.props.addItem(this.props.itemId)}>
						<i className="icon icon-plus"></i>
					</BoxButton>
					<span>
						{this.props.amount}
					</span>
					<BoxButton className="btn btn-action circle" style={{margin: '10px'}} onClick={() => this.props.removeItem(this.props.itemId)}>
						<i className="icon icon-minus"></i>
					</BoxButton>
				</BoxButtons>
				{ /*TODO +/- buttons*/ }
			</Box>
		)
	}
}

Item.propTypes = {
	itemId: PropTypes.number.isRequired,
	name: PropTypes.string.isRequired,
	package: PropTypes.string.isRequired,
	price: PropTypes.string.isRequired,
	priceNorm: PropTypes.string.isRequired,
	img: PropTypes.string.isRequired,
	addItem: PropTypes.func.isRequired,
	removeItem: PropTypes.func.isRequired,
	amount: PropTypes.number.isRequired,
}

const SERVER_PREFIX = '/intermarche/api/';

class App extends Component {
	constructor() {
		super();
		this.state = {
			account: {},
			favorites: {},
			favoritesSearch: '',
			cart: {},
			search: '',
			showCart: false,
		};
		this.getAccount = this.getAccount.bind(this);
		this.getFavorites = this.getFavorites.bind(this);
		this.getCart = this.getCart.bind(this);
		this.addItem = this.addItem.bind(this);
		this.removeItem = this.removeItem.bind(this);
		this.showCart = this.showCart.bind(this);
		this.hideCart = this.hideCart.bind(this);
		this.openOfficialSite = this.openOfficialSite.bind(this);
	}

	async componentWillMount() {
		await this.getAccount();
		Promise.all([
			this.getFavorites(),
			this.getCart()
		])
	}

	async getAccount() {
		const request = await fetch(SERVER_PREFIX + 'account');
		const rawData = await request.text();
		const accountData = JSON.parse(rawData);
		this.setState({ account: accountData });
	}

	async getFavorites() {
		const request = await fetch(SERVER_PREFIX + 'favorites');
		const rawData = await request.text();
		const favoritesData = JSON.parse(rawData);
		this.setState({ favorites: favoritesData });
	}

	async getCart() {
		const request = await fetch(SERVER_PREFIX + 'cart');
		const rawData = await request.text();
		const cartData = JSON.parse(rawData);
		this.setState({ cart: cartData });
	}

	async addItem(itemId) {
		await fetch(SERVER_PREFIX + 'item/add/' + itemId, { method: 'POST' });
		await this.getCart();
	}

	async removeItem(itemId) {
		await fetch(SERVER_PREFIX + 'item/remove/' + itemId, { method: 'POST' });
		await this.getCart()
	}

	showCart() {
		this.setState({ showCart: true, search: '' });
	}

	hideCart() {
		this.setState({ showCart: false, search: '' });
	}

	openOfficialSite() {
		var win = window.open('https://drive.intermarche.com', '_blank');
  		win.focus();
	}

	render() {
		// account info
		let accountText;
		const profile = this.state.account;
		if (profile.firstName) {
			accountText = 'Connected as ' + profile.firstName + ' ' + profile.lastName;
		} else {
			accountText = 'Connecting...';
		}

		// items
		const fav = this.state.favorites;
		const groups = fav.Categories;
		const pa = this.state.cart.Panier;
		let items = null;
		const self = this;
		if (groups && pa) {
			items = (
				<div>
					{groups.map(function(g) {
						let produits = fav.Produits.filter(p => p.CategorieMaison === g.Id);
						if (self.state.search) {
							produits = produits.filter(function(p) {
								const s = self.state.search.toLowerCase().trim();
								return p.Libelle.toLowerCase().includes(s);
							});
						}
						if (!produits.length) return null;
						return (
							<div key={g.Id}>
								<h3>{g.Libelle}</h3>
								<div>
									{produits.map(function(p) {
										let amount = 0;
										const f = pa.filter(pp => pp.IdProduit === p.IdProduit);
										if (f.length) {
											amount = f[0].QuantiteDec;
										}

										if (self.state.showCart && !amount) {
											return null;
										}

										return <Item
											name={p.Libelle}
											img={p.NomImage}
											price={p.Prix}
											priceNorm={p.PrixParQuantite}
											package={p.Conditionnement}
											itemId={p.IdProduit}
											amount={amount}
											addItem={self.addItem}
											removeItem={self.removeItem}
											key={p.IdProduit} />;
									})}
								</div>
							</div>
						);
					})}
				</div>
			);
		}


		return (
			<div className="App">
				<header className="App-header">
					<img src="https://driveimg1.intermarche.com/fr/Content/images/logos/logo-blanc_fr-FR.png" className="App-logo" alt="Drive Intermarché" />
					<h1 className="App-title">Easy Drive</h1>
					<p className="App-intro">
						{accountText}
					</p>
					<div>
						<button className={classnames({"btn": true, "btn-primary": !this.state.showCart })} onClick={this.hideCart}>Favorites</button>
						<button className={classnames({"btn": true, "btn-primary": this.state.showCart })} onClick={this.showCart}>Show cart (total {this.state.cart && this.state.cart.Total})</button>
						<button className={classnames({"btn": true })} onClick={this.openOfficialSite}>Go to official site</button>

					</div>
				</header>
				<div className="container">
					<div className="columns">
						<div className={classnames({"column": true, "col-mx-auto": true, "col-12-md": true, "col-8-xl": true, "col-6": true, "loading": !Object.keys(this.state.favorites).length, "loading-lg": true})}>
							<input className="form-input" type="text" placeholder="Filter" onChange={(e) => this.setState({ search: e.target.value })} style={{ marginBottom: "20px"}}></input>
							{items}
						</div>
					</div>
				</div>

			</div>
		);
	}
}

export default App;
